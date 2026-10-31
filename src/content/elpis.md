# Elpis

## Fast and still smart

Elpis runs Qwen3.8-27B on one RTX 3090 with the full 262K context. It reads 1,221 tokens per second and writes 126.

## Speed changes answers

Faster kernels round differently, and the answers drift. Benchmarks rarely show it.

## Every speedup is checked

A speedup ships only if the output stays the same, or if it passes a quality gate that I set before the measurement. Most of the speed comes from a draft model that never changes the output. A proof in Bend shows this, and on the GPU 90 of 90 prompts were bit-identical.

## Run

Elpis needs one RTX 3090, Docker and Nix. It serves an OpenAI-compatible API.
