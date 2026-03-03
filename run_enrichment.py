"""
run_enrichment.py
=================
CLI for running and testing the enrichment pipeline.

Usage:
    # Test on your sample fragrances first
    python run_enrichment.py --test

    # Enrich all pending fragrances
    python run_enrichment.py --all

    # Enrich a single fragrance
    python run_enrichment.py --brand "Acqua di Parma" --name "Cipresso di Toscana"

    # Retry all failed ones
    python run_enrichment.py --retry-failed

    # Re-enrich everything (force refresh)
    python run_enrichment.py --all --force

    # Limit to N fragrances (good for batch testing)
    python run_enrichment.py --all --limit 10
"""

import json
import logging
import argparse
import sqlite3
from pathlib import Path

from enrichment import enrich_all, enrich_single, DB_PATH

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger(__name__)

# Your real test fragrances from the sample data
TEST_FRAGRANCES = [
    ("4711",            "Acqua Colonia Intense Wakening Woods of Scandinavia"),
    ("4711",            "Remix Green Oasis"),
    ("Acqua di Parma",  "Arancia di Capri"),
    ("Acqua di Parma",  "Cipresso di Toscana"),
    ("Acqua di Parma",  "Bergamotto di Calabria"),
]


def print_result(brand: str, name: str, result: dict | None):
    """Pretty-print enrichment result for a single fragrance."""
    print(f"\n{'─'*60}")
    print(f"  {brand} — {name}")
    print(f"{'─'*60}")

    if not result:
        print("  ✗ FAILED — no data returned")
        return

    fields = [
        ("Perfumer",     result.get("perfumer")),
        ("Year",         result.get("year_released")),
        ("Concentration",result.get("concentration")),
        ("Gender",       result.get("gender_class")),
        ("Rating",       result.get("fragrantica_rating")),
        ("Votes",        result.get("fragrantica_votes")),
        ("Discontinued", "Yes" if result.get("is_discontinued") else "No"),
        ("URL",          result.get("fragrantica_url")),
    ]

    for label, value in fields:
        status = "✓" if value else "·"
        print(f"  {status}  {label:<16} {value or '—'}")

    for section, key in [("Top Notes", "top_notes"), ("Heart Notes", "middle_notes"), ("Base Notes", "base_notes")]:
        notes = json.loads(result.get(key) or "[]")
        if notes:
            print(f"  ✓  {section:<16} {', '.join(notes)}")
        else:
            print(f"  ·  {section:<16} —")

    accords = json.loads(result.get("main_accords") or "[]")
    if accords:
        print(f"  ✓  {'Accords':<16} {', '.join(accords)}")

    print(f"\n  Status: {result.get('enrichment_status', 'unknown')}")


def cmd_test(args):
    """Run enrichment on the test set and print detailed results."""
    print(f"\n🧪  Running enrichment test on {len(TEST_FRAGRANCES)} fragrances...\n")

    # Make sure DB is initialized with demo data first
    from sheets_ingest import main as run_ingest
    import sys
    sys.argv = ["sheets_ingest.py", "--demo"]
    run_ingest()

    passed, failed = 0, 0
    for brand, name in TEST_FRAGRANCES:
        result = enrich_single(brand, name, force=args.force)
        print_result(brand, name, result)
        if result and result.get("enrichment_status") == "success":
            passed += 1
        else:
            failed += 1

    print(f"\n{'═'*60}")
    print(f"  Test results: {passed} passed, {failed} failed")
    if failed > 0:
        print("  Note: Failures may be due to Fragrantica page structure changes.")
        print("  Check enrichment.py parse functions if > 50% fail.")
    print(f"{'═'*60}\n")


def cmd_single(args):
    """Enrich a single fragrance."""
    print(f"\nEnriching: {args.brand} — {args.name}")
    result = enrich_single(args.brand, args.name, force=args.force)
    print_result(args.brand, args.name, result)


def cmd_all(args):
    """Enrich all pending fragrances."""
    success, failed = enrich_all(
        limit=args.limit,
        force=args.force,
        status_filter="all" if args.force else "pending"
    )
    print(f"\n{'═'*60}")
    print(f"  Enrichment complete: {success} succeeded, {failed} failed")
    print(f"{'═'*60}\n")


def cmd_retry(args):
    """Retry all failed enrichments."""
    success, failed = enrich_all(status_filter="failed", force=True)
    print(f"\nRetry complete: {success} succeeded, {failed} still failing\n")


def cmd_status(args):
    """Show enrichment status summary."""
    if not Path(DB_PATH).exists():
        print("Database not found. Run --demo or --all first.")
        return

    con = sqlite3.connect(DB_PATH)
    rows = con.execute("""
        SELECT enrichment_status, COUNT(*) as count
        FROM fragrances
        GROUP BY enrichment_status
        ORDER BY count DESC
    """).fetchall()

    total = con.execute("SELECT COUNT(*) FROM fragrances").fetchone()[0]
    print(f"\n{'═'*40}")
    print(f"  Enrichment Status  ({total} total)")
    print(f"{'─'*40}")
    for status, count in rows:
        pct = (count / total * 100) if total else 0
        bar = "█" * int(pct / 5)
        print(f"  {status:<12} {count:>4}  {bar} {pct:.0f}%")
    print(f"{'═'*40}\n")
    con.close()


def main():
    parser = argparse.ArgumentParser(
        description="Sillage Enrichment Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("--force", action="store_true", help="Re-enrich even if already done")
    parser.add_argument("--limit", type=int, default=None, help="Max fragrances to process")

    sub = parser.add_subparsers(dest="command")

    sub.add_parser("test",         help="Test enrichment on sample fragrances")
    sub.add_parser("all",          help="Enrich all pending fragrances")
    sub.add_parser("retry-failed", help="Retry all failed enrichments")
    sub.add_parser("status",       help="Show enrichment status summary")

    single = sub.add_parser("single", help="Enrich one fragrance by brand+name")
    single.add_argument("--brand", required=True)
    single.add_argument("--name",  required=True)

    # Also support flat flags for convenience
    parser.add_argument("--test",         action="store_true")
    parser.add_argument("--all",          action="store_true")
    parser.add_argument("--retry-failed", action="store_true", dest="retry_failed")
    parser.add_argument("--status",       action="store_true")
    parser.add_argument("--brand",        type=str)
    parser.add_argument("--name",         type=str)

    args = parser.parse_args()

    if args.test or args.command == "test":
        cmd_test(args)
    elif args.brand and args.name:
        cmd_single(args)
    elif args.all or args.command == "all":
        cmd_all(args)
    elif args.retry_failed or args.command == "retry-failed":
        cmd_retry(args)
    elif args.status or args.command == "status":
        cmd_status(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
