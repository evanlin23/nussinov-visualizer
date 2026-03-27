import time
import random
import matplotlib.pyplot as plt
import sys
import os

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))
from nussinov import get_dp_table, suboptimal_traceback

def generate_random_rna(length):
    bases = ['A', 'C', 'G', 'U', 'I']
    return ''.join(random.choice(bases) for _ in range(length))

def benchmark():
    lengths = list(range(10, 201, 10))
    runtimes_dp = []
    runtimes_total = []
    
    # Default symmetric weights logic to test with
    test_weights = {
        'A': {'U': 1.0},
        'U': {'A': 1.0},
        'C': {'G': 1.0},
        'G': {'C': 1.0}
    }
    
    print("Starting Benchmark...")
    print(f"{'Length':<10} | {'DP Time (s)':<15} | {'Total Time (s)':<15}")
    print("-" * 45)
    
    for L in lengths:
        seq = generate_random_rna(L)
        
        start_time = time.time()
        dp = get_dp_table(seq, min_loop_length=3, weights=test_weights)
        dp_time = time.time() - start_time
        
        paths, trunc = suboptimal_traceback(dp, seq, min_loop_length=3, weights=test_weights, budget=0.0, limit=100000)
        total_time = time.time() - start_time
        
        runtimes_dp.append(dp_time)
        runtimes_total.append(total_time)
        print(f"{L:<10} | {dp_time:<15.4f} | {total_time:<15.4f}")
        
    plt.figure(figsize=(10, 6))
    plt.plot(lengths, runtimes_dp, label='DP Table Creation ($O(N^3)$)', marker='o', color='blue')
    plt.plot(lengths, runtimes_total, label='DP + Traceback', marker='x', color='red', linestyle='--')
    plt.xlabel('RNA Sequence Length')
    plt.ylabel('Runtime (seconds)')
    plt.title('Nussinov Algorithm Performance Benchmark')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'benchmark_plot.png')
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"\nBenchmark completed. Plot saved to {output_path}")

if __name__ == '__main__':
    benchmark()
