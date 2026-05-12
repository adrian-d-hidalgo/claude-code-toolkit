#!/usr/bin/env python3
"""
Example script template.

TODO: Replace with actual script.

Usage:
    python example.py --input file.txt

Requirements:
    - None (add dependencies here)
"""

import argparse
import sys


def main():
    parser = argparse.ArgumentParser(description="Example script")
    parser.add_argument('--input', required=True, help="Input file")

    args = parser.parse_args()

    try:
        # TODO: Implement script logic
        print(f"Processing: {args.input}")
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
