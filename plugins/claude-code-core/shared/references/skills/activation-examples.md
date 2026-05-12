# Activation Description Patterns

Effective descriptions follow formula: [What it does] + [When to use] + [Specific triggers]

## Domain-Specific Patterns

### File Processing Skills

```yaml
# PDF Processing
description: >
  Processes PDF files including rotation, merging, splitting, and text extraction.
  Use when working with PDFs, forms, or document processing. Handles PDF manipulation,
  form filling, and content extraction tasks.

# Excel/Spreadsheet
description: >
  Analyzes Excel spreadsheets, generates pivot tables, creates charts, and performs
  data analysis. Use when working with Excel files, spreadsheets, .xlsx files, or
  data analysis tasks. Handles formulas, macros, and data visualization.

# Image Processing
description: >
  Edits and processes images including rotation, resizing, format conversion, and
  filtering. Use when working with PNG, JPEG, SVG images, or image manipulation tasks.
  Handles red-eye removal, cropping, and color adjustments.
```

### Development Skills

```yaml
# Backend Development
description: >
  Develops Python backend with FastAPI, Django, Flask. Handles API design, async
  programming, database integration, authentication, and testing. Use when working
  with Python APIs, async/await, SQLAlchemy, pytest, or REST/GraphQL endpoints.

# Frontend Development
description: >
  Builds React applications with TypeScript, state management, and component architecture.
  Handles hooks, context, Redux, routing, and testing. Use when working with React,
  TypeScript, JSX/TSX files, or frontend component design.

# Database Design
description: >
  Designs database schemas, writes SQL queries, optimizes performance, and manages
  migrations. Handles PostgreSQL, MySQL, MongoDB schema design. Use when working with
  databases, SQL, schemas, indexes, or query optimization.
```

### Data & Analysis Skills

```yaml
# Data Analysis
description: >
  Analyzes data using Pandas, NumPy, and statistical methods. Generates visualizations,
  performs statistical tests, and creates reports. Use when working with CSV files,
  data analysis, statistics, or data visualization tasks.

# Machine Learning
description: >
  Develops machine learning models using scikit-learn, TensorFlow, PyTorch. Handles
  data preprocessing, model training, evaluation, and deployment. Use when working
  with ML models, training data, model evaluation, or predictions.
```

### DevOps & Infrastructure Skills

```yaml
# Docker/Containerization
description: >
  Creates and manages Docker containers, writes Dockerfiles, and orchestrates with
  docker-compose. Use when working with Docker, containers, Dockerfile, docker-compose.yml,
  or containerization tasks.

# CI/CD Pipeline
description: >
  Designs CI/CD pipelines using GitHub Actions, GitLab CI, Jenkins. Handles automated
  testing, deployment, and release management. Use when working with pipelines, GitHub
  Actions, .gitlab-ci.yml, or deployment automation.

# Infrastructure as Code
description: >
  Manages infrastructure using Terraform, CloudFormation, Ansible. Handles resource
  provisioning, configuration management, and infrastructure automation. Use when
  working with Terraform, .tf files, infrastructure provisioning, or cloud resources.
```

### Testing & QA Skills

```yaml
# Test Automation
description: >
  Creates automated tests using pytest, Jest, Cypress. Handles unit tests, integration
  tests, E2E tests, and test coverage. Use when working with testing, pytest, Jest,
  test files, or test automation tasks.

# API Testing
description: >
  Tests REST and GraphQL APIs using Postman, Newman, request libraries. Handles
  endpoint validation, response verification, and load testing. Use when working
  with API testing, Postman collections, API contracts, or endpoint validation.
```

### Documentation Skills

```yaml
# Technical Documentation
description: >
  Creates technical documentation, API docs, user guides, and README files. Handles
  markdown formatting, code examples, and diagram integration. Use when working with
  documentation, README.md, API documentation, or technical writing tasks.

# Diagram Creation
description: >
  Creates architecture diagrams, flowcharts, sequence diagrams using Mermaid, PlantUML.
  Use when working with diagrams, flowcharts, architecture visualization, or visual
  documentation tasks.
```

## Pattern Components

### High-Value Keywords by Category

**Actions**:
- troubleshoot, debug, analyze, optimize, design, implement
- create, build, develop, configure, manage
- test, validate, verify, monitor
- deploy, provision, automate

**Technologies** (be specific):
- Frameworks: FastAPI, Django, React, Vue, Angular
- Languages: Python, TypeScript, JavaScript, Go, Rust
- Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
- Tools: Docker, Kubernetes, Terraform, Jenkins

**File Types**:
- .py, .ts, .tsx, .jsx, .go, .rs
- .pdf, .xlsx, .csv, .json, .yaml
- Dockerfile, docker-compose.yml, .tf

**Problem Domains**:
- authentication, authorization, caching, validation
- deployment, monitoring, logging, error handling
- data processing, analysis, visualization
- API design, microservices, serverless

### Context Phrases

Use "when working with" pattern:

```
- "Use when working with [technology]"
- "Use when working with [file type]"
- "Use for [specific task]"
- "Handles [specific operations]"
```

### Avoid These Terms Alone

Low-value keywords (combine with specifics):
- help, assist, support
- code, programming, development (too generic)
- data, files, documents (too generic)
- stuff, things, work

## Testing Descriptions

Before finalizing, test with these scenarios:

**Should activate**:
- Phrases using specific technologies mentioned
- Phrases using file types mentioned
- Phrases using problem domains mentioned

**Should NOT activate**:
- Generic requests not in domain
- Similar keywords in different context
- Related but outside scope

Example for PDF skill:
- Should activate: "Rotate invoice.pdf", "Merge PDF files"
- Should NOT activate: "Create new PDF from scratch" (if skill only processes existing PDFs)

## Description Length Guidelines

- Minimum: 100 characters (too short lacks specificity)
- Sweet spot: 200-500 characters (specific without bloat)
- Maximum: 1024 characters (hard limit)

## Common Mistakes

**Too vague**:
```yaml
description: Helps with backend development
```

**Too narrow**:
```yaml
description: Rotates PDF files exactly 90 degrees clockwise only
```

**Perfect balance**:
```yaml
description: >
  Processes PDF files including rotation, merging, and text extraction.
  Use when working with PDFs, forms, or document processing tasks.
```

**Implementation-focused (WRONG)**:
```yaml
description: >
  Manages PDF processing with PyPDF2 library, configuration files, and validation scripts.
  Use when working with PDFs. Handles initialization and workflow execution.
```
Problem: Mentions internal components (PyPDF2, config files, scripts) instead of triggers.

**Activation-focused (CORRECT)**:
```yaml
description: >
  Processes PDF files including rotation, merging, and text extraction.
  Use when rotating PDFs, merging documents, extracting text, or working with PDF files.
```
Better: Lists action triggers (rotating, merging, extracting) and context triggers (working with PDF files).

## Focus on ACTIVATION not Implementation

**CRITICAL principle**: Description should answer "WHEN to activate" not "HOW it works".

### DO - Focus on Activation Triggers

**Action triggers** (verbs):
- ✅ analyzing, validating, auditing, creating, improving
- ✅ processing, converting, extracting, merging, optimizing
- ✅ testing, deploying, monitoring, configuring

**Context triggers**:
- ✅ "Use when working with [technology/file type/domain]"
- ✅ "Use for [specific task]"
- ✅ Path patterns: .claude/skills/*, src/*, specific directories

**Domain triggers**:
- ✅ Specific technologies: React, FastAPI, PostgreSQL
- ✅ Specific file types: .pdf, .ts, .py
- ✅ Specific tasks: code review, deployment, testing

### DON'T - Avoid Implementation Details

**Internal components** (implementation):
- ❌ SKILL.md files, YAML frontmatter, configuration files
- ❌ Library names: PyPDF2, requests, pandas (unless they're what user searches for)
- ❌ Internal scripts: init_skill.py, validate.sh
- ❌ Data structures: JSON objects, hash maps, arrays

**Process details** (how it works):
- ❌ "Loads configuration from config.yaml"
- ❌ "Validates using schema definition"
- ❌ "Executes workflow steps"
- ❌ "Processes through pipeline stages"

**Generic terms without specifics**:
- ❌ "files" alone (which files?)
- ❌ "documents" alone (what kind?)
- ❌ "code" alone (what language/domain?)

### Examples: Good vs Bad

**Example 1: Skill Manager**

❌ **Bad** (implementation-focused):
```yaml
Manages skill lifecycle with SKILL.md files, YAML frontmatter, and reference
documentation. Use when working with skills. Handles initialization scripts,
validation workflows, and manages .claude/skills/* directories.
```
Problems:
- Mentions SKILL.md, YAML, reference documentation (internal)
- "Handles initialization scripts" (how it works)
- "working with skills" too vague

✅ **Good** (activation-focused):
```yaml
Creates, improves, validates, and audits Claude Code skills for standards compliance.
Use when creating new skills, improving existing skills, analyzing skill quality,
validating compliance, or working with .claude/skills/* directories. Handles skill
ecosystems only, NOT application source code.
```
Improvements:
- Action triggers: creating, improving, validating, auditing
- Context triggers: skill quality, compliance, .claude/skills/*
- Differentiation: NOT application source code

**Example 2: PDF Processor**

❌ **Bad** (implementation-focused):
```yaml
Processes PDFs using PyPDF2 library with configuration validation and error handling.
Use when working with PDFs. Handles file I/O and processing workflows.
```
Problems:
- Mentions PyPDF2 (library detail)
- "configuration validation" (implementation)
- "file I/O and processing workflows" (how it works)

✅ **Good** (activation-focused):
```yaml
Processes PDF files including rotation, merging, splitting, and text extraction.
Use when rotating PDFs, merging documents, extracting text, compressing PDFs,
or working with PDF files.
```
Improvements:
- Specific actions: rotation, merging, splitting, extraction
- Concrete triggers: rotating, merging, extracting, compressing
- File type trigger: PDF files

**Example 3: API Testing**

❌ **Bad** (implementation-focused):
```yaml
Tests APIs using request libraries with response validation schemas and JSON parsing.
Handles HTTP methods and authentication headers.
```
Problems:
- "request libraries" (implementation)
- "response validation schemas" (internal)
- "JSON parsing" (how it works)

✅ **Good** (activation-focused):
```yaml
Tests REST and GraphQL APIs with endpoint validation and load testing.
Use when testing API endpoints, validating responses, checking API contracts,
load testing, or working with Postman collections.
```
Improvements:
- Specific domains: REST, GraphQL
- Action triggers: testing, validating, checking, load testing
- Context triggers: API endpoints, Postman collections

## Quick Checklist

Before finalizing description, verify:
- [ ] Starts with action verbs (not "Manages", "Handles")
- [ ] Lists specific triggers (not generic "working with files")
- [ ] NO internal components mentioned (SKILL.md, config files, libraries)
- [ ] NO process details (how it executes, loads, processes)
- [ ] Includes differentiation if scope could be confused
- [ ] Uses "Use when [triggers]" pattern
- [ ] Follows formula: [What] + [When] + [Triggers]
