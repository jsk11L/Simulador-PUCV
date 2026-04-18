from __future__ import annotations

import csv
import json
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from generate_exact_scenario_jsons import main as generate_exact_scenario_jsons
from build_colored_xlsx_report import main as build_colored_xlsx_report


@dataclass
class MetricRow:
    scenario: str
    ppe: float
    psce: float
    ee: float
    peo: float


PAPER = {
    "Caso Actual": MetricRow("Caso Actual", 37.13, 15.96, 1.33, 4.04),
    "PE": MetricRow("PE", 11.19, 16.51, 1.38, 1.09),
    "CAS": MetricRow("CAS", 47.46, 15.32, 1.28, 7.95),
    "R-10": MetricRow("R-10", 62.21, 15.65, 1.30, 12.14),
    "R+10": MetricRow("R+10", 16.56, 16.25, 1.35, 0.89),
    "R-10>40": MetricRow("R-10>40", 58.30, 15.73, 1.31, 10.06),
    "PF": MetricRow("PF", 75.11, 14.57, 1.21, 24.70),
}

SCENARIOS = [
    ("caso_actual", "Caso Actual"),
    ("pe", "PE"),
    ("cas", "CAS"),
    ("r_10", "R-10"),
    ("r_mas_10", "R+10"),
    ("r_10_gt_40", "R-10>40"),
    ("pf", "PF"),
]

TOTAL_ITERATIONS = 15000
CHUNK_SIZE = 1000
BASE_SEED = 20260416
MATLAB_EXE = r"C:\Program Files\MATLAB\R2026a\bin\matlab.exe"


def parse_go_csv(text: str) -> MetricRow:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if len(lines) < 2:
        raise RuntimeError(f"Unexpected Go output:\n{text}")

    reader = csv.DictReader(lines)
    rows = list(reader)
    if not rows:
        raise RuntimeError(f"No Go CSV rows parsed:\n{text}")

    row = rows[0]
    return MetricRow(
        scenario=row["scenario"],
        ppe=float(row["ppe"]),
        psce=float(row["psce"]),
        ee=float(row["ee"]),
        peo=float(row["peo"]),
    )


def parse_matlab_result(text: str) -> MetricRow:
    # Expected line: RESULT,<label>,<ppe>,<psce>,<ee>,<peo>
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("RESULT,"):
            continue
        parts = [p.strip() for p in line.split(",")]
        if len(parts) != 6:
            continue
        return MetricRow(
            scenario=parts[1],
            ppe=float(parts[2]),
            psce=float(parts[3]),
            ee=float(parts[4]),
            peo=float(parts[5]),
        )
    raise RuntimeError(f"No RESULT line found in MATLAB output:\n{text}")


def run_go_chunk(root: Path, scenario_id: str, iterations: int, seed: int) -> MetricRow:
    env = os.environ.copy()
    env["SCENARIO_ID"] = scenario_id
    env["ITERATIONS"] = str(iterations)
    env["SEED"] = str(seed)
    env["STRICT_PARITY"] = "1"

    cp = subprocess.run(
        ["go", "run", "./cmd/critical_compare"],
        cwd=root / "backend",
        check=True,
        capture_output=True,
        text=True,
        env=env,
    )
    return parse_go_csv(cp.stdout)


def run_matlab_chunk(root: Path, scenario_id: str, iterations: int, seed: int) -> MetricRow:
    batch = (
        "addpath('analysis'); "
        f"run_matlab_critical_chunk('{scenario_id}', {iterations}, {seed});"
    )

    cp = subprocess.run(
        [MATLAB_EXE, "-batch", batch],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    return parse_matlab_result(cp.stdout)


def average_rows(label: str, rows: list[MetricRow]) -> MetricRow:
    if not rows:
        raise RuntimeError(f"No rows to average for scenario: {label}")

    n = float(len(rows))
    return MetricRow(
        scenario=label,
        ppe=sum(r.ppe for r in rows) / n,
        psce=sum(r.psce for r in rows) / n,
        ee=sum(r.ee for r in rows) / n,
        peo=sum(r.peo for r in rows) / n,
    )


def metric_row_to_dict(row: MetricRow) -> dict[str, object]:
    return {
        "scenario": row.scenario,
        "ppe": row.ppe,
        "psce": row.psce,
        "ee": row.ee,
        "peo": row.peo,
    }


def chunk_record(chunk_index: int, seed: int, iterations: int, row: MetricRow) -> dict[str, object]:
    return {
        "chunk_index": chunk_index,
        "seed": seed,
        "iterations": iterations,
        "metrics": metric_row_to_dict(row),
    }


def delta(value: float, ref: float) -> float:
    return value - ref


def build_report_rows(go_rows: dict[str, MetricRow], matlab_rows: dict[str, MetricRow]) -> list[list[str]]:
    rows: list[list[str]] = []
    rows.append(
        [
            "scenario",
            "paper_ppe",
            "go_ppe",
            "matlab_ppe",
            "delta_go_ppe",
            "delta_matlab_ppe",
            "paper_psce",
            "go_psce",
            "matlab_psce",
            "delta_go_psce",
            "delta_matlab_psce",
            "paper_ee",
            "go_ee",
            "matlab_ee",
            "delta_go_ee",
            "delta_matlab_ee",
            "paper_peo",
            "go_peo",
            "matlab_peo",
            "delta_go_peo",
            "delta_matlab_peo",
        ]
    )

    for _, label in SCENARIOS:
        paper = PAPER[label]
        g = go_rows[label]
        m = matlab_rows[label]
        rows.append(
            [
                label,
                f"{paper.ppe:.2f}",
                f"{g.ppe:.2f}",
                f"{m.ppe:.2f}",
                f"{delta(g.ppe, paper.ppe):.2f}",
                f"{delta(m.ppe, paper.ppe):.2f}",
                f"{paper.psce:.2f}",
                f"{g.psce:.2f}",
                f"{m.psce:.2f}",
                f"{delta(g.psce, paper.psce):.2f}",
                f"{delta(m.psce, paper.psce):.2f}",
                f"{paper.ee:.2f}",
                f"{g.ee:.2f}",
                f"{m.ee:.2f}",
                f"{delta(g.ee, paper.ee):.2f}",
                f"{delta(m.ee, paper.ee):.2f}",
                f"{paper.peo:.2f}",
                f"{g.peo:.2f}",
                f"{m.peo:.2f}",
                f"{delta(g.peo, paper.peo):.2f}",
                f"{delta(m.peo, paper.peo):.2f}",
            ]
        )
    return rows


def main() -> None:
    root = Path(__file__).resolve().parents[1]

    generate_exact_scenario_jsons()

    if TOTAL_ITERATIONS % CHUNK_SIZE != 0:
        raise ValueError("TOTAL_ITERATIONS must be divisible by CHUNK_SIZE")

    go_final: dict[str, MetricRow] = {}
    matlab_final: dict[str, MetricRow] = {}
    json_report: dict[str, object] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base_seed": BASE_SEED,
        "total_iterations": TOTAL_ITERATIONS,
        "chunk_size": CHUNK_SIZE,
        "scenarios": [],
    }

    total_chunks = TOTAL_ITERATIONS // CHUNK_SIZE

    for idx, (scenario_id, label) in enumerate(SCENARIOS, start=1):
        print(f"\n=== Set {idx}/{len(SCENARIOS)}: {label} ===")

        go_chunks: list[MetricRow] = []
        go_chunk_records: list[dict[str, object]] = []
        for chunk in range(1, total_chunks + 1):
            done = chunk * CHUNK_SIZE
            seed = BASE_SEED + idx * 100000 + chunk
            row = run_go_chunk(root, scenario_id, CHUNK_SIZE, seed)
            go_chunks.append(row)
            go_chunk_records.append(chunk_record(chunk, seed, CHUNK_SIZE, row))
            print(f"GO {label}: {done}/{TOTAL_ITERATIONS}")

        go_final[label] = average_rows(label, go_chunks)

        matlab_chunks: list[MetricRow] = []
        matlab_chunk_records: list[dict[str, object]] = []
        for chunk in range(1, total_chunks + 1):
            done = chunk * CHUNK_SIZE
            seed = BASE_SEED + idx * 200000 + chunk
            row = run_matlab_chunk(root, scenario_id, CHUNK_SIZE, seed)
            matlab_chunks.append(row)
            matlab_chunk_records.append(chunk_record(chunk, seed, CHUNK_SIZE, row))
            print(f"MATLAB {label}: {done}/{TOTAL_ITERATIONS}")

        matlab_final[label] = average_rows(label, matlab_chunks)

        paper = PAPER[label]
        json_report["scenarios"].append(
            {
                "scenario_id": scenario_id,
                "label": label,
                "paper": metric_row_to_dict(paper),
                "go": {
                    "chunks": go_chunk_records,
                    "average": metric_row_to_dict(go_final[label]),
                },
                "matlab": {
                    "chunks": matlab_chunk_records,
                    "average": metric_row_to_dict(matlab_final[label]),
                },
                "deltas": {
                    "go_vs_paper": {
                        "ppe": delta(go_final[label].ppe, paper.ppe),
                        "psce": delta(go_final[label].psce, paper.psce),
                        "ee": delta(go_final[label].ee, paper.ee),
                        "peo": delta(go_final[label].peo, paper.peo),
                    },
                    "matlab_vs_paper": {
                        "ppe": delta(matlab_final[label].ppe, paper.ppe),
                        "psce": delta(matlab_final[label].psce, paper.psce),
                        "ee": delta(matlab_final[label].ee, paper.ee),
                        "peo": delta(matlab_final[label].peo, paper.peo),
                    },
                },
            }
        )

    report_rows = build_report_rows(go_final, matlab_final)
    out_csv = root / "analysis" / "Critical Comparison Report.csv"
    out_json = root / "analysis" / "Critical Comparison Report.json"

    with out_csv.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(report_rows)

    with out_json.open("w", encoding="utf-8") as f:
        json.dump(json_report, f, ensure_ascii=False, indent=2)

    # Keep a presentation-ready Excel file in sync with the generated CSV.
    try:
        build_colored_xlsx_report()
    except PermissionError as exc:
        print(f"Warning: could not overwrite XLSX report (likely open in Excel): {exc}")

    print("\nComparison complete")
    print(f"Report CSV: {out_csv}")
    print(f"Report JSON: {out_json}")
    print(f"Report XLSX: {root / 'analysis' / 'Critical Comparison Report.xlsx'}")


if __name__ == "__main__":
    main()
