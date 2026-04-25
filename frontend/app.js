document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predict-form');
    const seqInput = document.getElementById('sequence');
    const charCount = document.getElementById('char-count');
    const minLoopInput = document.getElementById('min-loop');
    const thresholdInput = document.getElementById('threshold');
    
    const submitBtn = document.getElementById('submit-btn');
    const errorMsg = document.getElementById('error-msg');
    
    const resultsContent = document.getElementById('results-content');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    const resScore = document.getElementById('res-score');
    const resNumStructures = document.getElementById('res-num-structures');
    const resTruncated = document.getElementById('res-truncated');
    
    const bases = ['A', 'C', 'G', 'U', 'I'];
    
    const presetSelect = document.getElementById('weight-preset');

    const presets = {
        basic: { 'A-U': 1.0, 'U-A': 1.0, 'C-G': 1.0, 'G-C': 1.0 },
        turner: { 
            'C-G': 3.0, 'G-C': 3.0, 
            'A-U': 2.1, 'U-A': 2.1, 
            'G-U': 1.2, 'U-G': 1.2,
            'I-C': 1.8, 'C-I': 1.8,
            'I-U': 1.2, 'U-I': 1.2,
            'I-A': 0.7, 'A-I': 0.7
        }
    };

    function setWeightsFromPreset(presetName) {
        if (presetName === 'custom') return;
        
        bases.forEach(b1 => {
            bases.forEach(b2 => {
                if (b1 !== b2) {
                    const input = document.getElementById(`w-${b1}-${b2}`);
                    if (input) input.value = 0.0;
                }
            });
        });

        const weights = presets[presetName];
        if (weights) {
            for (const [pair, val] of Object.entries(weights)) {
                const [b1, b2] = pair.split('-');
                const input = document.getElementById(`w-${b1}-${b2}`);
                if (input) input.value = val.toFixed(1);
            }
        }
    }

    const thermoDesc = document.getElementById('thermo-desc');

    function updateThermoDescVisibility(presetName) {
        if (thermoDesc) {
            if (presetName === 'turner') {
                thermoDesc.classList.remove('hidden');
            } else {
                thermoDesc.classList.add('hidden');
            }
        }
    }

    if (presetSelect) {
        updateThermoDescVisibility(presetSelect.value);
        presetSelect.addEventListener('change', (e) => {
            setWeightsFromPreset(e.target.value);
            updateThermoDescVisibility(e.target.value);
        });
    }

    bases.forEach(b1 => {
        bases.forEach(b2 => {
            if (b1 !== b2) {
                const input = document.getElementById(`w-${b1}-${b2}`);
                if(input) {
                    input.addEventListener('input', (e) => {
                        const symmetricInput = document.getElementById(`w-${b2}-${b1}`);
                        if(symmetricInput) symmetricInput.value = e.target.value;
                        
                        if (presetSelect) {
                            presetSelect.value = 'custom';
                            updateThermoDescVisibility('custom');
                        }
                    });
                }
            }
        });
    });

    seqInput.addEventListener('input', () => {
        let val = seqInput.value.replace(/\s+/g, '');
        charCount.textContent = `${val.length} / 200`;
        if (val.length > 200) {
            charCount.style.color = "var(--error-color)";
        } else {
            charCount.style.color = "var(--text-secondary)";
        }
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let seq = seqInput.value.trim().toUpperCase();
        const minLoop = parseInt(minLoopInput.value, 10);
        const threshold = parseFloat(thresholdInput.value);
        
        seq = seq.replace(/\s+/g, '');
        
        if (!seq) {
            showError("Please enter an RNA sequence.");
            return;
        }
        
        if (!/^[ACGUI]+$/.test(seq)) {
            showError("Sequence contains invalid characters. Use A, C, G, U, I.");
            return;
        }
        
        if (seq.length > 200) {
            showError("Sequence length cannot exceed 200 elements.");
            return;
        }
        
        hideError();
        setLoading(true);
        resTruncated.classList.add('hidden');
        
        const weightsMatrix = {};
        bases.forEach(b1 => {
            weightsMatrix[b1] = {};
            bases.forEach(b2 => {
                const el = document.getElementById(`w-${b1}-${b2}`);
                const val = el ? parseFloat(el.value) : 0;
                weightsMatrix[b1][b2] = isNaN(val) ? 0.0 : val;
            });
        });

        try {
            const data = predict(seq, minLoop, weightsMatrix, isNaN(threshold) ? 0.0 : threshold);

            if (data.error) {
                showError(data.error);
                setLoading(false);
                return;
            }

            displayResults(data);

        } catch (error) {
            showError("Prediction failed: " + error.message);
            console.error(error);
        } finally {
            setLoading(false);
        }
    });
    
    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
    }
    
    function hideError() {
        errorMsg.classList.add('hidden');
    }
    
    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.querySelector('.btn-text').textContent = "Predicting...";
            loadingSpinner.classList.remove('hidden');
            resultsContent.classList.add('hidden');
        } else {
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').textContent = "Predict Structures";
            loadingSpinner.classList.add('hidden');
        }
    }
    
    function displayResults(data) {
        resScore.textContent = data.score;
        resNumStructures.textContent = data.num_structures;
        if (data.truncated) {
            resTruncated.classList.remove('hidden');
        }

        resultsContent.classList.remove('hidden');

        renderFornac(data.sequence, data.dotBracket);
        renderHeatmap(data.sequence, data.frequencies);
    }

    function renderFornac(seq, dotBracket) {
        const dotBracketEl = document.getElementById('fornac-dot-bracket');
        dotBracketEl.textContent = dotBracket;

        const containerEl = document.getElementById('fornac-container');
        containerEl.innerHTML = '';

        if (typeof fornac === 'undefined' || typeof fornac.FornaContainer === 'undefined') {
            containerEl.textContent = 'Fornac library failed to load.';
            return;
        }

        const container = new fornac.FornaContainer('#fornac-container', {
            animation: true,
            zoomable: true,
            initialSize: [containerEl.clientWidth || 600, 400],
            labelInterval: 0
        });

        container.addRNA(dotBracket, { sequence: seq });
    }
    
    function renderHeatmap(seq, freqMatrix) {
        const labels = seq.split('');
        const xLabels = labels.map((char, i) => `${i+1}: ${char}`);
        
        const yLabels = [...xLabels].reverse();
        const reversedFreqMatrix = [...freqMatrix].reverse();
        
        const trace = {
            z: reversedFreqMatrix,
            x: xLabels,
            y: yLabels,
            type: 'heatmap',
            colorscale: 'Viridis',
            hoverinfo: 'x+y+z',
            showscale: true
        };
        
        const plotEl = document.getElementById('heatmap-plot');
        const plotWidth = plotEl.parentElement.clientWidth;

        const layout = {
            margin: { t: 10, r: 10, b: 80, l: 80 },
            xaxis: {
                tickangle: -45,
                tickfont: { size: 10, family: 'monospace' }
            },
            yaxis: {
                tickfont: { size: 10, family: 'monospace' }
            },
            width: plotWidth,
            height: 700,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };
        
        const config = { responsive: true, displayModeBar: false };
        
        if (window.Plotly) {
            Plotly.newPlot('heatmap-plot', [trace], layout, config);
        }
    }
});
