from __future__ import annotations

import os
import subprocess
from pathlib import Path

from generate_exact_scenario_jsons import main as generate_exact_scenario_jsons


MATLAB_EXE = r"C:\Program Files\MATLAB\R2026a\bin\matlab.exe"
SCENARIO_ID = "caso_actual"
ITERATIONS = 1000
SEED = 20260416


def run_go_trace(root: Path, trace_out: Path) -> None:
    env = os.environ.copy()
    env["SCENARIO_ID"] = SCENARIO_ID
    env["ITERATIONS"] = str(ITERATIONS)
    env["SEED"] = str(SEED)
    env["STRICT_PARITY"] = "1"
    env["TRACE_OUT"] = str(trace_out)

    subprocess.run(
        ["go", "run", "./cmd/trace_case1"],
        cwd=root / "backend",
        check=True,
        text=True,
        env=env,
    )


def run_matlab_trace(root: Path, trace_out: Path) -> None:
    matlab_trace = str(trace_out).replace("\\", "/")
    batch = (
        "addpath('analysis'); "
        f"run_matlab_case1_full_trace('{SCENARIO_ID}', {ITERATIONS}, {SEED}, '{matlab_trace}');"
    )

    subprocess.run(
        [MATLAB_EXE, "-batch", batch],
        cwd=root,
        check=True,
        text=True,
    )


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    trace_dir = root / "analysis" / "traces"
    trace_dir.mkdir(parents=True, exist_ok=True)

    generate_exact_scenario_jsons()

    go_trace = trace_dir / "case1_go.jsonl"
    matlab_trace = trace_dir / "case1_matlab.jsonl"

    run_go_trace(root, go_trace)
    run_matlab_trace(root, matlab_trace)

    print(f"GO trace: {go_trace}")
    print(f"MATLAB trace: {matlab_trace}")


if __name__ == "__main__":
    main()
