---
name: pdf-processor
description: >
  Processes PDF files including rotation, merging, splitting, and text extraction.
  Use when working with PDFs, document processing, form filling, or PDF manipulation.
  Handles PDF rotation, merging multiple PDFs, splitting pages, and extracting text content.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---

# PDF Processor

Automates PDF manipulation tasks including rotation, merging, splitting, and text extraction. Provides command-line interface and programmatic access to common PDF operations.

## Overview

What this skill provides:
- Rotate PDF pages (90°, 180°, 270°)
- Merge multiple PDF files into single document
- Split PDFs by page ranges or individual pages
- Extract text content with formatting preservation

## Workflow

Step-by-step process:

1. **Step 1: Validate Input**
   - Check PDF file exists and is readable
   - Verify file extension (.pdf)
   - Confirm file size within limits

2. **Step 2: Execute Operation**
   - Load references/pdf-operations.md for operation details
   - Execute scripts/pdf_processor.py with appropriate arguments
   - Monitor operation progress

3. **Step 3: Validation**
   - Verify output PDF is valid
   - Check page count matches expectations
   - Confirm file integrity

## Usage Examples

**Example 1: Rotate PDF**
Input: "Rotate document.pdf 90 degrees clockwise"
Action: Execute scripts/pdf_processor.py --rotate 90 document.pdf
Output: "Created document_rotated.pdf with all pages rotated 90°"

**Example 2: Merge Multiple PDFs**
Input: "Merge report1.pdf, report2.pdf, and summary.pdf into final_report.pdf"
Workflow:
1. Validate all input PDFs exist
2. Execute merge operation (see references/pdf-operations.md)
3. Verify page count: 45 pages total
Output: "Successfully merged 3 PDFs into final_report.pdf (45 pages)"

**Example 3: Extract Text with Errors**
Input: "Extract text from scanned_document.pdf"
Action: Attempt text extraction, detect scanned images
Output: "Warning: document contains scanned images. OCR required. Extracted 0 text blocks."

## Resources

**Scripts** (scripts/):
- pdf_processor.py - Core PDF manipulation operations (rotate, merge, split, extract)

**References** (references/):
- pdf-operations.md - Detailed operation specifications and parameters
- troubleshooting.md - Common errors and solutions

**Assets** (assets/):
- example.pdf - Sample PDF for testing operations

## Common Issues

| Problem | Solution |
|---------|----------|
| "PDF is encrypted" | Use --password flag or remove encryption first |
| "Invalid page range" | Verify page numbers exist (1-indexed) |
| "Memory error with large PDF" | Process in chunks using --batch-size parameter |

See references/troubleshooting.md for complete issue database.

## Output Format

Provide concise responses:
- Bullet points over paragraphs
- Explanations limited to 3-5 sentences unless detail requested
- Code examples only when needed

## Key Principles

- Always validate input PDFs before processing
- Preserve original files (create new output files)
- Handle encrypted PDFs gracefully with clear error messages
- Use progressive disclosure: load references only when needed
- Provide clear progress feedback for long operations
