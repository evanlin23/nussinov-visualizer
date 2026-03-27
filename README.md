# Nussinov RNA Secondary Structure Predictor

This repository contains the final project for **CS 466**, focusing on predicting RNA secondary structures using an extended version of the Nussinov dynamic programming algorithm.

## Features

- **Core Algorithm**: Dynamic programming implementation to find RNA structures that maximize base pairing scores based on user-defined interaction weights.
- **Custom Weight Matrix**: Supports symmetric user-defined weighting (like thermodynamic delta functions) for pairings across the standard A, C, G, U bases, as well as **Inosine (I)** bindings.
- **Suboptimal Structure Enumeration (Wuchty Algorithm)**: The codebase departs from a basic trace route and natively implements depth-first-search backtracking to discover and catalog all valid suboptimal structure configurations that fall within a specified loss threshold. Includes hard-stop safety constraints (up to 100,000 mappings generated) to prevent computational blowout.
- **Base Pair Frequencies Heatmap**: Dynamically displays a plot modeling the mathematical probability distribution of overlapping permutations across all valid iterations.
- **Premium Web UI**: A beautiful, minimalist vanilla-JS interface powered seamlessly through a FastAPI python backend.

## Project Structure

```text
.
├── backend/
│   ├── main.py        # FastAPI server configuration and Predict endpoints
│   └── nussinov.py    # The core DP engine and recursive iterative backtracking algorithm logic
├── frontend/
│   ├── index.html     # Web UI Layout
│   ├── styles.css     # Clean Minimalist UI formatting
│   └── app.js         # Payload packaging, plotly rendering, and UI validation controls 
├── benchmark.py       # Performance testing Python module
└── requirements.txt   # Python Dependencies
```

## Setup and Installation

1. Create a Python Virtual Environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install the necessary dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Web Application

To launch both the REST API backend and the Javascript frontend simultaneously, execute the following uvicorn command from your project root:

```bash
uvicorn backend.main:app --reload
```
You can then access the interface visually in your browser by visiting `http://127.0.0.1:8000/`.

## Running the Benchmark Utility

To visualize the computational scale of the DP algorithm, use the isolated benchmarking script. This will emit randomly generated sequences scaling from length 10 to 200 elements, test raw DP table creation times against trace enumeration times, and plot an $O(N^3)$ curve visualization natively to `benchmark_plot.png`.

```bash
python benchmark.py
```
