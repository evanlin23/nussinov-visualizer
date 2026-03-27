import math

def get_pair_weight(b1, b2, weights_matrix):
    try:
        w1 = weights_matrix.get(b1, {}).get(b2, 0.0)
        w2 = weights_matrix.get(b2, {}).get(b1, 0.0)
        return max(w1, w2)
    except Exception:
        return 0.0

def get_dp_table(seq, min_loop_length, weights):
    n = len(seq)
    dp = [[0.0]*n for _ in range(n)]
    
    for length in range(2, n+1):
        for i in range(n - length + 1):
            j = i + length - 1
            
            if j - i <= min_loop_length:
                dp[i][j] = 0.0
                continue
                
            ans = dp[i][j-1]
            
            for k in range(i, j - min_loop_length):
                w = get_pair_weight(seq[k], seq[j], weights)
                if w > 0:
                    left = dp[i][k-1] if k-1 >= i else 0.0
                    inside = dp[k+1][j-1] if j-1 >= k+1 else 0.0
                    ans = max(ans, left + inside + w)
                    
            dp[i][j] = ans
    return dp

def suboptimal_traceback(dp, seq, min_loop_length, weights, budget=0.0, limit=100000):
    n = len(seq)
    results = []
    
    if n <= min_loop_length:
        return [[]], False

    stack = [([(0, n-1)], 0.0, [])]
    unique_structures = set()
    truncated = False
    
    while stack:
        if len(unique_structures) >= limit:
            truncated = True
            break
            
        intervals, curr_loss, path = stack.pop()
        
        if not intervals:
            struct = frozenset(path)
            if struct not in unique_structures:
                unique_structures.add(struct)
                results.append(path)
            continue
            
        i, j = intervals[-1]
        rem_intervals = intervals[:-1]
        
        if i >= j or j - i <= min_loop_length:
            stack.append((rem_intervals, curr_loss, path))
            continue
            
        loss_unpaired = dp[i][j] - dp[i][j-1]
        if curr_loss + loss_unpaired <= budget + 1e-6:
            stack.append((rem_intervals + [(i, j-1)], curr_loss + loss_unpaired, path))
            
        for k in range(i, j - min_loop_length):
            w = get_pair_weight(seq[k], seq[j], weights)
            if w > 0:
                left = dp[i][k-1] if k-1 >= i else 0.0
                inside = dp[k+1][j-1] if j-1 >= k+1 else 0.0
                loss_paired = dp[i][j] - (left + inside + w)
                
                if curr_loss + loss_paired <= budget + 1e-6:
                    new_intervals = rem_intervals + []
                    if k-1 >= i:
                        new_intervals.append((i, k-1))
                    if j-1 >= k+1:
                        new_intervals.append((k+1, j-1))
                        
                    stack.append((new_intervals, curr_loss + loss_paired, path + [(k, j)]))
                    
    return results, truncated

def structures_to_dot_bracket(seq, paths):
    n = len(seq)
    results = []
    for path in paths:
        s = ['.'] * n
        for (k, j) in path:
            s[k] = '('
            s[j] = ')'
        results.append("".join(s))
    return list(set(results))

def get_pair_frequencies(paths, n):
    freq = [[0]*n for _ in range(n)]
    if not paths: return freq
    for path in paths:
        for (k, j) in path:
            freq[k][j] += 1
            freq[j][k] += 1
            
    num_paths = len(paths)
    for i in range(n):
        for j in range(n):
            freq[i][j] = round(freq[i][j] / num_paths, 4)
    return freq
