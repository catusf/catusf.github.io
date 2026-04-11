/**
 * gedcom-parser.js — Shared GEDCOM parsing utilities for Phan Family Tree Tools
 *
 * Provides:
 *   GedcomParser.parse(text)       → { individuals, families, header }
 *   GedcomParser.buildTree(parsed) → { tree, rootName, rootBirth, totalNodes, maxGen, totalPeople }
 *   GedcomParser.findRoot(parsed)  → id of best root (no parents, most descendants)
 *
 * Usage:
 *   <script src="gedcom-parser.js"></script>
 *   const { individuals, families } = GedcomParser.parse(gedcomText);
 *   const result = GedcomParser.buildTree({ individuals, families });
 */

// eslint-disable-next-line no-unused-vars
const GedcomParser = (function () {
  'use strict';

  /**
   * Parse raw GEDCOM text into structured data.
   * @param {string} text - Raw GEDCOM file content
   * @returns {{ individuals: Object, families: Object, header: Object }}
   */
  function parse(text) {
    const lines = text.split(/\r?\n/);
    const individuals = {};
    const families = {};
    const header = { charset: '', source: '', gedcVersion: '' };
    let curType = null, curId = null, lastTag = null;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const sp = line.split(' ');
      const level = parseInt(sp[0]);
      if (isNaN(level)) continue;

      if (level === 0) {
        if (sp.length >= 3) {
          curId = sp[1];
          curType = sp[2];
          lastTag = null;
          if (curType === 'INDI') {
            individuals[curId] = {
              id: curId, name: '', sex: '', birth: '', death: '',
              famc: [], fams: [],
              // Extended fields (used by Validator)
              birthDate: '', deathDate: '', birthPlace: '', deathPlace: '',
              occupation: '', note: ''
            };
          } else if (curType === 'FAM') {
            families[curId] = {
              id: curId, husb: '', wife: '', children: [],
              marrDate: '', divDate: ''
            };
          }
        } else if (sp.length === 2 && sp[1] === 'HEAD') {
          curType = 'HEAD'; curId = 'HEAD'; lastTag = null;
        }
      } else if (level === 1 && curId) {
        const tag = sp[1];
        const val = sp.slice(2).join(' ');
        lastTag = tag;

        if (curType === 'INDI') {
          const indi = individuals[curId];
          if (tag === 'NAME') {
            const m = val.match(/\/([^/]+)\//);
            if (m) {
              const sur = m[1].trim(), giv = val.slice(0, m.index).trim();
              indi.name = giv ? sur + ' ' + giv : sur;
            } else {
              indi.name = val.replace(/\//g, '').trim();
            }
            // Also store raw NAME for tools that need it
            indi.nameRaw = val;
          }
          else if (tag === 'SEX')  indi.sex = val;
          else if (tag === 'FAMC') indi.famc.push(val);
          else if (tag === 'FAMS') indi.fams.push(val);
          else if (tag === 'OCCU') indi.occupation = val;
          else if (tag === 'NOTE') indi.note = val;
        } else if (curType === 'FAM') {
          const fam = families[curId];
          if      (tag === 'HUSB') fam.husb = val;
          else if (tag === 'WIFE') fam.wife = val;
          else if (tag === 'CHIL') fam.children.push(val);
        } else if (curType === 'HEAD') {
          if (tag === 'CHAR') header.charset = val;
          if (tag === 'SOUR') header.source = val;
        }
      } else if (level === 2 && curId) {
        const tag = sp[1], val = sp.slice(2).join(' ');

        if (curType === 'INDI') {
          const indi = individuals[curId];
          if (tag === 'DATE') {
            if      (lastTag === 'BIRT') { indi.birth = val; indi.birthDate = val; }
            else if (lastTag === 'DEAT') { indi.death = val; indi.deathDate = val; }
          } else if (tag === 'PLAC') {
            if      (lastTag === 'BIRT') indi.birthPlace = val;
            else if (lastTag === 'DEAT') indi.deathPlace = val;
          } else if (tag === 'GIVN') {
            indi.givn = val;
          } else if (tag === 'SURN') {
            indi.surn = val;
          }
        } else if (curType === 'FAM') {
          const fam = families[curId];
          if (tag === 'DATE') {
            if      (lastTag === 'MARR') fam.marrDate = val;
            else if (lastTag === 'DIV')  fam.divDate = val;
          }
        } else if (curType === 'HEAD') {
          if (tag === 'VERS' && lastTag === 'GEDC') header.gedcVersion = val;
        }
      }
    }

    return { individuals, families, header };
  }

  /**
   * Find the best root person (no parents, most descendants).
   * @param {{ individuals: Object, families: Object }} parsed
   * @returns {string} XREF ID of best root
   */
  function findRoot(parsed) {
    const { individuals, families } = parsed;

    function countDesc(id, vis) {
      if (vis.has(id)) return 0;
      vis.add(id);
      let c = 0;
      const indi = individuals[id];
      if (!indi) return 0;
      for (const fid of indi.fams) {
        for (const cid of (families[fid] || {}).children || []) {
          if (!vis.has(cid)) { c++; c += countDesc(cid, vis); }
        }
      }
      return c;
    }

    const noParents = Object.keys(individuals).filter(id => individuals[id].famc.length === 0);
    let bestRoot = noParents[0] || Object.keys(individuals)[0];
    let bestCount = 0;
    for (const id of noParents) {
      const c = countDesc(id, new Set());
      if (c > bestCount) { bestCount = c; bestRoot = id; }
    }
    return bestRoot;
  }

  /**
   * Build a hierarchical tree from parsed GEDCOM data.
   * @param {{ individuals: Object, families: Object }} parsed
   * @param {string} [rootId] - Optional root XREF ID; auto-detected if omitted
   * @returns {{ tree: Object, rootName: string, rootBirth: string, totalNodes: number, maxGen: number, totalPeople: number }}
   */
  function buildTree(parsed, rootId) {
    const { individuals, families } = parsed;

    // Build spouse map
    const spouseMap = {};
    for (const fam of Object.values(families)) {
      const h = fam.husb, w = fam.wife;
      if (h && w) {
        (spouseMap[h] = spouseMap[h] || []).push(w);
        (spouseMap[w] = spouseMap[w] || []).push(h);
      }
    }

    if (!rootId) rootId = findRoot(parsed);

    // Recursive tree builder
    const visited = new Set();
    function buildNode(id, gen) {
      if (visited.has(id)) return null;
      visited.add(id);
      const ind = individuals[id];
      if (!ind) return null;

      const birth = extractYear(ind.birth);
      const death = extractYear(ind.death);
      const spouses = (spouseMap[id] || []).map(function (spId) {
        const sp = individuals[spId] || {};
        return {
          id: spId, name: sp.name || '', sex: sp.sex || '',
          birth: extractYear(sp.birth), death: extractYear(sp.death)
        };
      });

      const children = [];
      for (const fid of ind.fams) {
        for (const cid of (families[fid] || {}).children || []) {
          const ch = buildNode(cid, gen + 1);
          if (ch) children.push(ch);
        }
      }

      const node = { id: id, name: ind.name, sex: ind.sex, birth: birth, death: death, gen: gen, spouses: spouses };
      if (children.length) node.children = children;
      return node;
    }

    const tree = buildNode(rootId, 1);
    let totalNodes = 0, maxGen = 1;
    (function count(n) {
      if (!n) return;
      totalNodes++;
      if (n.gen > maxGen) maxGen = n.gen;
      (n.children || []).forEach(count);
    })(tree);

    const rootInd = individuals[rootId] || {};
    return {
      tree: tree,
      rootName: rootInd.name || rootId,
      rootBirth: extractYear(rootInd.birth),
      totalNodes: totalNodes,
      maxGen: maxGen,
      totalPeople: Object.keys(individuals).length
    };
  }

  /**
   * Extract a 4-digit year from a GEDCOM date string.
   * Handles: "1893", "15 MAR 1893", "ABT 1900", "BEF 1950", etc.
   * @param {string} dateStr
   * @returns {string} Year or empty string
   */
  function extractYear(dateStr) {
    if (!dateStr) return '';
    const m = dateStr.match(/\b(\d{4})\b/);
    return m ? m[1] : dateStr.split(' ')[0] || '';
  }

  /**
   * Build a flat index of all individuals for search.
   * @param {Object} tree - Hierarchical tree from buildTree()
   * @returns {{ index: Object, list: Array }}
   */
  function buildFlatIndex(tree) {
    const index = {};
    const list = [];
    (function flat(n) {
      if (!n || index[n.id]) return;
      index[n.id] = n;
      list.push(n);
      (n.children || []).forEach(flat);
    })(tree);
    list.sort(function (a, b) { return a.name.localeCompare(b.name, 'vi'); });
    return { index: index, list: list };
  }

  // Public API
  return {
    parse: parse,
    findRoot: findRoot,
    buildTree: buildTree,
    buildFlatIndex: buildFlatIndex,
    extractYear: extractYear
  };
})();
