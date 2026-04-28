/**
 * Core Logic for Genealogy Relationship Calculation
 * Extracted from RelationshipCaluclator.html
 */

// ════════════════════════════════════════════════════════════
// 1. GEDCOM PARSER
// ════════════════════════════════════════════════════════════
function parseGEDCOM(text) {
  const lines = text.split(/\r?\n/);
  const people  = new Map();
  const families = new Map();
  const warnings = [];

  let cur = null, curType = null;

  for (let raw of lines) {
    const m = raw.match(/^(\d+)\s+(@[^@]+@|[A-Z_]+)\s*(.*)?$/);
    if (!m) continue;
    const [, lvlS, tag, val] = m;
    const lvl = parseInt(lvlS);
    const value = (val || '').trim();

    if (lvl === 0) {
      if (tag.startsWith('@') && value === 'INDI') {
        cur = { id: tag, name: '', sex: 'U', birthYear: null, famcList: [], famsList: [] };
        curType = 'INDI';
        people.set(tag, cur);
      } else if (tag.startsWith('@') && value === 'FAM') {
        cur = { id: tag, husb: null, wife: null, children: [] };
        curType = 'FAM';
        families.set(tag, cur);
      } else {
        cur = null; curType = null;
      }
      continue;
    }

    if (!cur) continue;

    if (curType === 'INDI') {
      if (tag === 'NAME') {
        cur.name = value.replace(/\//g, '').replace(/\s+/g, ' ').trim();
      } else if (tag === 'SEX') {
        const s = value.toUpperCase();
        cur.sex = (s === 'M' || s === 'F') ? s : 'U';
      } else if (tag === 'DATE' && lvl === 2) {
        if (cur._inBirt) {
          const ym = value.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
          if (ym) cur.birthYear = parseInt(ym[1]);
          cur._inBirt = false;
        }
      } else if (tag === 'BIRT' && lvl === 1) {
        cur._inBirt = true;
      } else if (tag === 'FAMC' && lvl === 1) {
        cur.famcList.push(value);
      } else if (tag === 'FAMS' && lvl === 1) {
        cur.famsList.push(value);
      }
    } else if (curType === 'FAM') {
      if (tag === 'HUSB' && lvl === 1) cur.husb = value;
      else if (tag === 'WIFE' && lvl === 1) cur.wife = value;
      else if (tag === 'CHIL' && lvl === 1) cur.children.push(value);
    }
  }

  for (const p of people.values()) delete p._inBirt;

  const parents  = new Map(); 
  const children = new Map(); 
  const spouses  = new Map(); 

  const addChild = (parentId, childId) => {
    if (!children.has(parentId)) children.set(parentId, []);
    if (!children.get(parentId).includes(childId))
      children.get(parentId).push(childId);
  };
  const addSpouse = (a, b) => {
    if (!spouses.has(a)) spouses.set(a, []);
    if (!spouses.get(a).includes(b)) spouses.get(a).push(b);
  };

  for (const fam of families.values()) {
    if (fam.husb && fam.wife) {
      addSpouse(fam.husb, fam.wife);
      addSpouse(fam.wife, fam.husb);
    }
    for (const childId of fam.children) {
      const pArr = [];
      if (fam.husb) { pArr.push(fam.husb); addChild(fam.husb, childId); }
      if (fam.wife) { pArr.push(fam.wife); addChild(fam.wife, childId); }
      if (!parents.has(childId)) parents.set(childId, []);
      for (const p of pArr) {
        if (!parents.get(childId).includes(p))
          parents.get(childId).push(p);
      }
    }
  }

  let missingLinks = 0;
  for (const p of people.values()) {
    if (p.famcList.length === 0 && p.famsList.length === 0) missingLinks++;
  }
  if (missingLinks > 0 && missingLinks === people.size) {
    warnings.push(`Không tìm thấy FAMC/FAMS trong file — quan hệ không thể tính`);
  }

  return { people, families, parents, children, spouses, warnings };
}

// ════════════════════════════════════════════════════════════
// 2. BFS UTILITIES
// ════════════════════════════════════════════════════════════

function bfsPath(startId, endId, index) {
  if (startId === endId) return [startId];
  const { parents, children } = index;
  const queue = [[startId, [startId]]];
  const visited = new Set([startId]);

  while (queue.length > 0) {
    const [node, path] = queue.shift();
    const neighbors = [
      ...(parents.get(node) || []),
      ...(children.get(node) || []),
    ];
    for (const nb of neighbors) {
      if (visited.has(nb)) continue;
      visited.add(nb);
      const newPath = [...path, nb];
      if (nb === endId) return newPath;
      queue.push([nb, newPath]);
    }
  }
  return null;
}

function bfsAncestors(startId, index) {
  const { parents } = index;
  const result = new Map([[startId, 0]]);
  const queue = [[startId, 0]];
  const visited = new Set([startId]);

  while (queue.length > 0) {
    const [node, depth] = queue.shift();
    for (const p of (parents.get(node) || [])) {
      if (visited.has(p)) continue;
      visited.add(p);
      result.set(p, depth + 1);
      queue.push([p, depth + 1]);
    }
  }
  return result;
}

function ancestorPath(startId, targetId, index) {
  if (startId === targetId) return [startId];
  const { parents } = index;
  const queue = [[startId, [startId]]];
  const visited = new Set([startId]);

  while (queue.length > 0) {
    const [node, path] = queue.shift();
    for (const p of (parents.get(node) || [])) {
      if (visited.has(p)) continue;
      visited.add(p);
      const newPath = [...path, p];
      if (p === targetId) return newPath;
      queue.push([p, newPath]);
    }
  }
  return [startId]; 
}

// ════════════════════════════════════════════════════════════
// 3. LCA FINDING
// ════════════════════════════════════════════════════════════

function findLCAs(idA, idB, index) {
  const { people } = index;
  const ancsA = bfsAncestors(idA, index); 
  const ancsB = bfsAncestors(idB, index); 

  const candidates = [];
  for (const [id, da] of ancsA) {
    if (ancsB.has(id)) {
      const db = ancsB.get(id);
      candidates.push({ id, da, db, total: da + db });
    }
  }

  if (candidates.length === 0) return [];

  const minTotal = Math.min(...candidates.map(c => c.total));
  const tied = candidates.filter(c => c.total === minTotal);

  if (tied.length === 1) return tied;

  function countMaleSteps(fromId, toId) {
    const path = ancestorPath(fromId, toId, index);
    let count = 0;
    for (const nid of path) {
      if (nid === fromId) continue; 
      const p = people.get(nid);
      if (p && p.sex === 'M') count++;
    }
    return count;
  }

  const scored = tied.map(c => ({ ...c, maleSteps: countMaleSteps(idA, c.id) }));
  const maxMale = Math.max(...scored.map(s => s.maleSteps));
  const best = scored.filter(s => s.maleSteps === maxMale);

  const bestId = best[0].id;
  return [
    best[0],
    ...tied.filter(c => c.id !== bestId)
  ];
}

// ════════════════════════════════════════════════════════════
// 4. RELATIONSHIP LABEL ENGINE
// ════════════════════════════════════════════════════════════

function sexLabel(personId, people, labelM, labelF, labelU) {
  const p = people.get(personId);
  if (!p) return labelU || `${labelM}/${labelF}`;
  if (p.sex === 'M') return labelM;
  if (p.sex === 'F') return labelF;
  return labelU || `${labelM}/${labelF}`;
}

function compareChilOrder(idA, idB, index, famId) {
  const { families } = index;
  const fid = famId || sharedFamily(idA, idB, index);
  if (!fid) return 0;
  const fam = families.get(fid);
  if (!fam) return 0;
  const iA = fam.children.indexOf(idA);
  const iB = fam.children.indexOf(idB);
  if (iA === -1 || iB === -1) return 0;
  return iA < iB ? 1 : iA > iB ? -1 : 0;
}

function sharedFamily(idA, idB, index) {
  const { families } = index;
  for (const fam of families.values()) {
    if (fam.children.includes(idA) && fam.children.includes(idB)) {
      return fam.id;
    }
  }
  return null;
}

function lcaFamForChild(lcaId, childId, index) {
  const { families } = index;
  for (const fam of families.values()) {
    const isLcaParent = fam.husb === lcaId || fam.wife === lcaId;
    if (isLcaParent && fam.children.includes(childId)) return fam.id;
  }
  return null;
}

function branchNode(pathFromPerson, lcaId) {
  if (!pathFromPerson || pathFromPerson.length < 2) return null;
  const lcaIdx = pathFromPerson.indexOf(lcaId);
  if (lcaIdx <= 0) return null;
  return pathFromPerson[lcaIdx - 1]; 
}

function compareBranchRank(taId, tbId, lcaId, index, warnings) {
  if (taId === tbId) return 0;
  const { families } = index;
  for (const fam of families.values()) {
    const isLca = fam.husb === lcaId || fam.wife === lcaId;
    if (!isLca) continue;
    const iA = fam.children.indexOf(taId);
    const iB = fam.children.indexOf(tbId);
    if (iA !== -1 && iB !== -1) {
      // warnings.push('Thứ bậc nhánh dựa trên CHIL order trong FAM ' + fam.id);
      return iA < iB ? 1 : iA > iB ? -1 : 0;
    }
  }
  if (warnings) warnings.push('Không tìm được FAM chứa cả TA và TB — không xác định thứ bậc nhánh');
  return 0;
}

function detectPatMat(pathAct, people) {
  // Phase 2: Detect paternal (nội) vs maternal (ngoại) line
  // pathAct = path from actor to LCA, e.g. [actorId, parentId, ..., lcaId]
  // Returns 'nội' if actor's first step toward LCA is male,
  //         'ngoại' if female, null if unknown/unavailable
  if (!pathAct || pathAct.length < 2) return null;
  const parentId = pathAct[1];
  const parent = people.get(parentId);
  if (!parent) return null;
  if (parent.sex === 'M') return 'nội';
  if (parent.sex === 'F') return 'ngoại';
  return null;
}

function compareAge(idA, idB, index, famId) {
  return compareChilOrder(idA, idB, index, famId);
}

function computeLabel(da, db, actorId, targetId, index, relType) {
  const { people } = index;
  const warnings = [];

  // Extract paths early for Phase 2 detection
  const lcaId   = (arguments[6] !== undefined) ? arguments[6] : null;
  const pathAct = (arguments[7] !== undefined) ? arguments[7] : null;
  const pathTgt = (arguments[8] !== undefined) ? arguments[8] : null;
  const targetSex = people.get(targetId)?.sex || 'U';

  const sexOf = (id, m, f, u) => {
    const p = people.get(id); if (!p) return u || `${m}/${f}`;
    if (p.sex === 'M') return m;
    if (p.sex === 'F') return f;
    return u || `${m}/${f}`;
  };
  const warnSex = (id) => people.get(id)?.sex === 'U' ? [`SEX không rõ cho ${id}: hiển thị nhãn gộp`] : [];

  if (relType === 'spouse')        return { label: sexOf(targetId, 'chồng', 'vợ', 'vợ/chồng'), warnings };
  if (relType === 'sibling-spouse') return { label: sexOf(actorId,  'anh rể/em rể', 'chị dâu/em dâu', 'dâu/rể'), warnings };
  if (relType === 'child-spouse')  return { label: sexOf(targetId, 'con rể', 'con dâu', 'con dâu/rể'), warnings };

  if (da === 0) {
    if (db === 1) return { label: sexOf(targetId, 'con trai',   'con gái',   'con'),        warnings: warnSex(targetId) };
    if (db === 2) return { label: sexOf(targetId, 'cháu trai',  'cháu gái',  'cháu'),       warnings: warnSex(targetId) };
    if (db === 3) return { label: sexOf(targetId, 'chắt trai',  'chắt gái',  'chắt'),       warnings: warnSex(targetId) };
    if (db === 4) return { label: sexOf(targetId, 'chút trai',  'chút gái',  'chút'),       warnings: warnSex(targetId) };
    return { label: 'hậu duệ (' + db + ' đời)', warnings: [] };
  }

  if (db === 0) {
    if (da === 1) return { label: sexOf(targetId, 'bố',       'mẹ',       'bố/mẹ'),      warnings: warnSex(targetId) };
    if (da === 2) {
      // Phase 2: Detect paternal (nội) vs maternal (ngoại) grandfather/grandmother
      const pm = detectPatMat(pathAct, people);
      const wSex = warnSex(targetId);
      if (targetSex === 'M') {
        if (pm) return { label: 'ông ' + pm, warnings: wSex };
        return { label: 'ông nội/ông ngoại', warnings: [...wSex, 'Không xác định nội/ngoại'] };
      }
      if (targetSex === 'F') {
        if (pm) return { label: 'bà ' + pm, warnings: wSex };
        return { label: 'bà nội/bà ngoại', warnings: [...wSex, 'Không xác định nội/ngoại'] };
      }
      return { label: pm ? `ông/bà ${pm}` : 'ông/bà', warnings: [...wSex, ...(!pm ? ['Không xác định nội/ngoại'] : [])] };
    }
    if (da === 3) return { label: sexOf(targetId, 'cụ (ông)', 'cụ (bà)',  'cụ'),          warnings: warnSex(targetId) };
    if (da === 4) return { label: sexOf(targetId, 'kỵ (ông)', 'kỵ (bà)',  'kỵ'),          warnings: warnSex(targetId) };
    return { label: 'tổ tiên (' + da + ' đời)', warnings: [] };
  }

  const taId = lcaId && pathAct ? branchNode(pathAct, lcaId) : null;
  const tbId = lcaId && pathTgt ? branchNode(pathTgt, lcaId) : null;

  const branchW = [];
  let branchRank;
  if (taId && tbId && lcaId) {
    if (taId === tbId) {
      branchRank = compareChilOrder(actorId, targetId, index, null);
      if (branchRank === 0) branchW.push('Không xác định được thứ tự anh/em trong cùng nhánh');
    } else {
      branchRank = compareBranchRank(taId, tbId, lcaId, index, branchW);
    }
  } else {
    branchRank = compareChilOrder(actorId, targetId, index, null);
    if (branchRank === 0) branchW.push('Không xác định được thứ bậc nhánh — thiếu path info');
  }

  const delta = db - da;

  const juniorDist = delta >= 0 ? db : da;
  const suffix = juniorDist <= 1 ? '' : juniorDist <= 3 ? ' họ' : ' họ xa';

  const allW = [...branchW];

  if (delta > 0) {
    return { label: 'cháu' + suffix, warnings: allW };
  }

  if (delta < 0) {
    if (delta === -1) {
      if (branchRank < 0) return { label: 'bác' + suffix, warnings: allW };
      if (branchRank > 0) {
        // Phase 2: Detect paternal (chú/cô) vs maternal (cậu/dì)
        const pm = detectPatMat(pathAct, people);
        if (targetSex === 'M') {
          if (pm === 'nội')   return { label: 'chú' + suffix, warnings: allW };
          if (pm === 'ngoại') return { label: 'cậu' + suffix, warnings: allW };
          return { label: 'chú/cậu' + suffix, warnings: [...allW, 'Không xác định nội/ngoại'] };
        }
        if (targetSex === 'F') {
          if (pm === 'nội')   return { label: 'cô' + suffix, warnings: allW };
          if (pm === 'ngoại') return { label: 'dì' + suffix, warnings: allW };
          return { label: 'cô/dì' + suffix, warnings: [...allW, 'Không xác định nội/ngoại'] };
        }
        return { label: 'chú/cậu/cô/dì' + suffix, warnings: [`SEX không rõ cho ${targetId}`, ...allW] };
      }
      if (targetSex === 'M') return { label: 'bác/chú' + suffix, warnings: [...allW, 'Không xác định thứ bậc nhánh'] };
      if (targetSex === 'F') return { label: 'bác/cô'  + suffix, warnings: [...allW, 'Không xác định thứ bậc nhánh'] };
      return { label: 'bác/chú/cô' + suffix, warnings: [...allW, 'Không xác định thứ bậc nhánh'] };
    }
    if (delta === -2) {
      if (targetSex === 'M') return { label: 'ông' + suffix, warnings: allW };
      if (targetSex === 'F') return { label: 'bà'  + suffix, warnings: allW };
      return { label: 'ông/bà' + suffix, warnings: allW };
    }
    if (delta === -3) {
      if (targetSex === 'M') return { label: 'cụ (ông)' + suffix, warnings: allW };
      if (targetSex === 'F') return { label: 'cụ (bà)'  + suffix, warnings: allW };
      return { label: 'cụ' + suffix, warnings: allW };
    }
    if (delta === -4) {
      if (targetSex === 'M') return { label: 'kỵ (ông)' + suffix, warnings: allW };
      if (targetSex === 'F') return { label: 'kỵ (bà)'  + suffix, warnings: allW };
      return { label: 'kỵ' + suffix, warnings: allW };
    }
    return { label: 'tổ tiên (' + Math.abs(delta) + ' đời)' + suffix, warnings: allW };
  }

  if (branchRank > 0) {
    return { label: 'em' + suffix, warnings: allW };
  }
  if (branchRank < 0) {
    if (targetSex === 'M') return { label: 'anh' + suffix, warnings: allW };
    if (targetSex === 'F') return { label: 'chị' + suffix, warnings: allW };
    return { label: 'anh/chị' + suffix, warnings: [`SEX không rõ cho ${targetId}`, ...allW] };
  }
  if (branchRank === 0) {
    if (targetSex === 'M') return { label: 'anh' + suffix, warnings: allW };
    if (targetSex === 'F') return { label: 'chị' + suffix, warnings: allW };
    return { label: 'anh/chị/em' + suffix, warnings: allW };
  }
  return { label: 'anh/chị/em' + suffix, warnings: allW };
}

// ════════════════════════════════════════════════════════════
// 5. MAIN RELATION CALCULATOR
// ════════════════════════════════════════════════════════════

function calcRelation(idA, idB, index) {
  const { people, spouses } = index;
  const warnings = [];

  if (idA === idB) return { aToBLabel: '(cùng một người)', bToALabel: '(cùng một người)', warnings: ['A và B là cùng một người'], debug: null };

  const lcas = findLCAs(idA, idB, index);

  if (lcas.length > 0) {
    const primary = lcas[0];
    const { da, db } = primary;

    if (lcas.length > 1) {
      const primaryId = lcas[0].id;
      const primarySpouses = spouses.get(primaryId) || [];
      const hasNonSpouseLCA = lcas.slice(1).some(lca => !primarySpouses.includes(lca.id));
      if (hasNonSpouseLCA) {
        warnings.push(`Có ${lcas.length} LCA cùng độ sâu — áp dụng paternal-first selection`);
      }
    }

    const relTypeAtoB = da === 0 ? 'ancestor' : db === 0 ? 'descendant' : 'collateral';
    const relTypeBtoA = db === 0 ? 'ancestor' : da === 0 ? 'descendant' : 'collateral';

    const primaryPathA = ancestorPath(idA, primary.id, index); 
    const primaryPathB = ancestorPath(idB, primary.id, index); 

    const aToBResult = computeLabel(da, db, idA, idB, index, relTypeAtoB, primary.id, primaryPathA, primaryPathB);
    const bToAResult = computeLabel(db, da, idB, idA, index, relTypeBtoA, primary.id, primaryPathB, primaryPathA);
    warnings.push(...aToBResult.warnings, ...bToAResult.warnings);

    const pathToNamedArr = (pathIds) => pathIds.map(nid => {
      const np = people.get(nid);
      return { id: nid, name: np ? (np.name || '?') : '?' };
    });
    const lcaDebug = lcas.map(lca => {
      const pA = lca.id === primary.id ? primaryPathA : ancestorPath(idA, lca.id, index);
      const pB = lca.id === primary.id ? primaryPathB : ancestorPath(idB, lca.id, index);
      return {
        id: lca.id,
        name: people.get(lca.id)?.name || '?',
        da: lca.da,
        db: lca.db,
        pathA: pathToNamedArr(pA),
        pathB: pathToNamedArr(pB),
        selected: lca.id === primary.id
      };
    });

    const debugObj = {
      A: personDebug(idA, people),
      B: personDebug(idB, people),
      relation: { type: relTypeAtoB, da, db },
      LCAs: lcaDebug,
      aToBLabel: aToBResult.label,
      bToALabel: bToAResult.label,
      warnings: [...new Set(warnings.filter(Boolean))]
    };

    return {
      aToBLabel: aToBResult.label,
      bToALabel: bToAResult.label,
      warnings: debugObj.warnings,
      debug: debugObj
    };
  }

  const spA = spouses.get(idA) || [];
  if (spA.includes(idB)) {
    const aToBResult = computeLabel(0, 0, idA, idB, index, 'spouse');
    const bToAResult = computeLabel(0, 0, idB, idA, index, 'spouse');
    const debugObj = {
      A: personDebug(idA, people),
      B: personDebug(idB, people),
      relation: { type: 'spouse', da: 0, db: 0 },
      LCAs: [],
      aToBLabel: aToBResult.label,
      bToALabel: bToAResult.label,
      warnings: []
    };
    return { aToBLabel: aToBResult.label, bToALabel: bToAResult.label, warnings: [], debug: debugObj };
  }

  const aParents = index.parents.get(idA) || [];
  for (const ap of aParents) {
    const siblings = index.children.get(ap) || [];
    for (const sib of siblings) {
      if (sib === idA) continue;
      if ((spouses.get(sib) || []).includes(idB)) {
        const pB = people.get(idB);
        const sharedFamSib = sharedFamily(idA, sib, index);
        const aVsSib = compareChilOrder(idA, sib, index, sharedFamSib);
        let label, labelRev;
        const bSex = pB?.sex;
        if (aVsSib > 0) {
          label    = bSex === 'M' ? 'em rể'  : bSex === 'F' ? 'em dâu'  : 'em dâu/rể';
          labelRev = 'anh/chị';
        } else if (aVsSib < 0) {
          label    = bSex === 'M' ? 'anh rể' : bSex === 'F' ? 'chị dâu' : 'anh/chị dâu rể';
          labelRev = 'em';
        } else {
          label    = bSex === 'M' ? 'anh rể/em rể' : bSex === 'F' ? 'chị dâu/em dâu' : 'dâu/rể';
          labelRev = 'anh/chị/em';
        }
        const debugObj = { A: personDebug(idA, people), B: personDebug(idB, people), relation: { type: 'sibling-spouse', da: 1, db: 1 }, LCAs: [], aToBLabel: label, bToALabel: labelRev, warnings: [] };
        return { aToBLabel: label, bToALabel: labelRev, warnings: [], debug: debugObj };
      }
    }
  }

  const aChildren = index.children.get(idA) || [];
  for (const child of aChildren) {
    if ((spouses.get(child) || []).includes(idB)) {
      const pB = people.get(idB);
      const label    = pB?.sex === 'M' ? 'con rể'        : pB?.sex === 'F' ? 'con dâu'        : 'con dâu/rể';
      const labelRev = pB?.sex === 'M' ? 'bố/mẹ vợ'     : pB?.sex === 'F' ? 'bố/mẹ chồng'   : 'bố/mẹ vợ/chồng';
      const debugObj = { A: personDebug(idA, people), B: personDebug(idB, people), relation: { type: 'child-spouse', da: 1, db: 0 }, LCAs: [], aToBLabel: label, bToALabel: labelRev, warnings: [] };
      return { aToBLabel: label, bToALabel: labelRev, warnings: [], debug: debugObj };
    }
  }

  const spousesA = spouses.get(idA) || [];
  for (const spA of spousesA) {
    if (spA === idB) continue;
    const via = calcRelation(spA, idB, index);
    if (via.aToBLabel !== 'không xác định') {
      const pSpA  = people.get(spA);
      const spName = pSpA ? pSpA.name : spA;
      const note  = '(qua vợ/chồng của A: ' + spName + ')';
      const warn  = 'Không tìm thấy quan hệ trực tiếp — hiển thị qua vợ/chồng của A (' + spName + ')';
      const debug2 = via.debug ? Object.assign({}, via.debug, {
        via_spouse_of: 'A',
        via_id: spA,
        via_name: spName
      }) : null;
      return {
        aToBLabel: via.aToBLabel + ' ' + note,
        bToALabel: via.bToALabel + ' ' + note,
        warnings: [warn, ...(via.warnings || [])],
        debug: debug2
      };
    }
  }

  const spousesB = spouses.get(idB) || [];
  for (const spB of spousesB) {
    if (spB === idA) continue;
    const via = calcRelation(idA, spB, index);
    if (via.aToBLabel !== 'không xác định') {
      const pSpB  = people.get(spB);
      const spName = pSpB ? pSpB.name : spB;
      const note  = '(qua vợ/chồng của B: ' + spName + ')';
      const warn  = 'Không tìm thấy quan hệ trực tiếp — hiển thị qua vợ/chồng của B (' + spName + ')';
      const debug2 = via.debug ? Object.assign({}, via.debug, {
        via_spouse_of: 'B',
        via_id: spB,
        via_name: spName
      }) : null;
      return {
        aToBLabel: via.aToBLabel + ' ' + note,
        bToALabel: via.bToALabel + ' ' + note,
        warnings: [warn, ...(via.warnings || [])],
        debug: debug2
      };
    }
  }

  const debugObj = {
    A: personDebug(idA, people),
    B: personDebug(idB, people),
    relation: { type: 'unknown', da: null, db: null },
    LCAs: [],
    aToBLabel: 'không xác định',
    bToALabel: 'không xác định',
    warnings: ['Không tìm thấy đường kết nối giữa A và B trong dữ liệu GEDCOM']
  };
  return { aToBLabel: 'không xác định', bToALabel: 'không xác định', warnings: debugObj.warnings, debug: debugObj };
}

function personDebug(id, people) {
  const p = people.get(id);
  if (!p) return { id, name: '?', sex: '?', birthYear: null };
  return { id: p.id, name: p.name, sex: p.sex, birthYear: p.birthYear || null };
}

// ════════════════════════════════════════════════════════════
// 6. EXPORTS
// ════════════════════════════════════════════════════════════
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseGEDCOM,
    bfsPath,
    bfsAncestors,
    ancestorPath,
    findLCAs,
    sexLabel,
    compareChilOrder,
    sharedFamily,
    lcaFamForChild,
    branchNode,
    compareBranchRank,
    compareAge,
    detectPatMat,
    computeLabel,
    calcRelation,
    personDebug
  };
}
