---
layout: page
title: Projects
permalink: /projects/
---


Danh sách các dự án của tôi

{% for repo in site.github.public_repositories %}

{% if repo.fork == false and repo.topics.size > 0 %}

## [{{ repo.name }}]({{ repo.html_url }})

{{ repo.description }}

Topics: {{ repo.topics | array_to_sentence_string }}

Last updated: {{ repo.updated_at | date_to_string }}

{% endif %}

{% endfor %}
