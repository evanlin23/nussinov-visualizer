/**
 * Nussinov RNA Secondary Structure Prediction Algorithm
 * Ported from backend/nussinov.py for client-side execution
 */

function getPairWeight(b1, b2, weightsMatrix) {
    const w1 = (weightsMatrix[b1] && weightsMatrix[b1][b2]) || 0.0;
    const w2 = (weightsMatrix[b2] && weightsMatrix[b2][b1]) || 0.0;
    return Math.max(w1, w2);
}

function getDpTable(seq, minLoopLength, weights) {
    const n = seq.length;
    const dp = Array.from({ length: n }, () => new Array(n).fill(0.0));

    for (let length = 2; length <= n; length++) {
        for (let i = 0; i <= n - length; i++) {
            const j = i + length - 1;

            if (j - i <= minLoopLength) {
                dp[i][j] = 0.0;
                continue;
            }

            let ans = dp[i][j - 1];

            for (let k = i; k < j - minLoopLength; k++) {
                const w = getPairWeight(seq[k], seq[j], weights);
                if (w > 0) {
                    const left = (k - 1 >= i) ? dp[i][k - 1] : 0.0;
                    const inside = (j - 1 >= k + 1) ? dp[k + 1][j - 1] : 0.0;
                    ans = Math.max(ans, left + inside + w);
                }
            }

            dp[i][j] = ans;
        }
    }
    return dp;
}

function suboptimalTraceback(dp, seq, minLoopLength, weights, budget = 0.0, limit = 100000) {
    const n = seq.length;
    const results = [];

    if (n <= minLoopLength) {
        return { paths: [[]], truncated: false };
    }

    const stack = [{ intervals: [[0, n - 1]], currLoss: 0.0, path: [] }];
    const uniqueStructures = new Set();
    let truncated = false;

    while (stack.length > 0) {
        if (uniqueStructures.size >= limit) {
            truncated = true;
            break;
        }

        const { intervals, currLoss, path } = stack.pop();

        if (intervals.length === 0) {
            const key = path.map(p => p[0] + ',' + p[1]).sort().join(';');
            if (!uniqueStructures.has(key)) {
                uniqueStructures.add(key);
                results.push(path);
            }
            continue;
        }

        const [i, j] = intervals[intervals.length - 1];
        const remIntervals = intervals.slice(0, -1);

        if (i >= j || j - i <= minLoopLength) {
            stack.push({ intervals: remIntervals, currLoss, path });
            continue;
        }

        const lossUnpaired = dp[i][j] - dp[i][j - 1];
        if (currLoss + lossUnpaired <= budget + 1e-6) {
            stack.push({
                intervals: remIntervals.concat([[i, j - 1]]),
                currLoss: currLoss + lossUnpaired,
                path
            });
        }

        for (let k = i; k < j - minLoopLength; k++) {
            const w = getPairWeight(seq[k], seq[j], weights);
            if (w > 0) {
                const left = (k - 1 >= i) ? dp[i][k - 1] : 0.0;
                const inside = (j - 1 >= k + 1) ? dp[k + 1][j - 1] : 0.0;
                const lossPaired = dp[i][j] - (left + inside + w);

                if (currLoss + lossPaired <= budget + 1e-6) {
                    const newIntervals = remIntervals.slice();
                    if (k - 1 >= i) {
                        newIntervals.push([i, k - 1]);
                    }
                    if (j - 1 >= k + 1) {
                        newIntervals.push([k + 1, j - 1]);
                    }

                    stack.push({
                        intervals: newIntervals,
                        currLoss: currLoss + lossPaired,
                        path: path.concat([[k, j]])
                    });
                }
            }
        }
    }

    return { paths: results, truncated };
}

function structuresToDotBracket(seq, paths) {
    const n = seq.length;
    const resultSet = new Set();
    paths.forEach(path => {
        const s = new Array(n).fill('.');
        path.forEach(([k, j]) => {
            s[k] = '(';
            s[j] = ')';
        });
        resultSet.add(s.join(''));
    });
    return Array.from(resultSet);
}

function getPairFrequencies(paths, n) {
    const freq = Array.from({ length: n }, () => new Array(n).fill(0));
    if (paths.length === 0) return freq;

    paths.forEach(path => {
        path.forEach(([k, j]) => {
            freq[k][j] += 1;
            freq[j][k] += 1;
        });
    });

    const numPaths = paths.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            freq[i][j] = Math.round((freq[i][j] / numPaths) * 10000) / 10000;
        }
    }
    return freq;
}

/**
 * Main predict function - replaces the /api/predict endpoint
 */
function predict(sequence, minLoopLength, weights, suboptimalThreshold = 0.0) {
    let seq = sequence.toUpperCase().replace(/\s+/g, '');

    if (!seq) {
        return { error: "Empty sequence" };
    }
    if (seq.length > 200) {
        return { error: "Sequence too long (Max 200 constraint enforced)" };
    }

    const dp = getDpTable(seq, minLoopLength, weights);
    const { paths, truncated } = suboptimalTraceback(dp, seq, minLoopLength, weights, suboptimalThreshold);
    const score = seq.length > 0 ? dp[0][seq.length - 1] : 0;

    // Deduplicate paths
    const uniqueSet = new Set();
    const uniquePaths = [];
    paths.forEach(p => {
        const key = p.map(pair => pair[0] + ',' + pair[1]).sort().join(';');
        if (!uniqueSet.has(key)) {
            uniqueSet.add(key);
            uniquePaths.push(p);
        }
    });

    const freqMatrix = getPairFrequencies(uniquePaths, seq.length);
    const dotBrackets = structuresToDotBracket(seq, uniquePaths);

    return {
        sequence: seq,
        score: Math.round(score * 10000) / 10000,
        num_structures: uniquePaths.length,
        truncated,
        frequencies: freqMatrix,
        dotBracket: dotBrackets.length > 0 ? dotBrackets[0] : '.'.repeat(seq.length)
    };
}
