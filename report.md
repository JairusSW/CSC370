# Report on CUDA Performance

> Note: I'm running a dual AMD 7900XTX setup, so I'm using [SCALE](https://docs.scale-lang.com/stable/) as a compatibility layer for running CUDA on amd gpus. It does have very similar performance compared to raw CUDA (+-5% difference) so hopefully it's fine. Results will probably vary a bit when running raw CUDA, but the overhead is *very* minimal.

## Results

| Matrix Width | Block Size | CPU Time (ms) | GPU Total Time (ms) | Total Data Transfer Time (ms) | GPU Processing Time (ms) | Speedup |
| --- | --- | --- | --- | --- | --- | --- |
| 4 | 2 | 0.000000 | 0.743795 | 0.653344 | 0.090451 | 0.000000 |
| 4 | 4 | 0.000000 | 0.717106 | 0.645991 | 0.071115 | 0.000000 |
| 8 | 2 | 0.000000 | 0.605844 | 0.534399 | 0.071445 | 0.000000 |
| 8 | 4 | 0.000000 | 0.696035 | 0.625221 | 0.070814 | 0.000000 |
| 8 | 8 | 0.000000 | 0.712006 | 0.632325 | 0.079681 | 0.000000 |
| 16 | 2 | 0.001000 | 0.691535 | 0.615422 | 0.076113 | 0.001446 |
| 16 | 4 | 0.001000 | 0.724218 | 0.650579 | 0.073639 | 0.001381 |
| 16 | 8 | 0.001000 | 0.704621 | 0.628317 | 0.076304 | 0.001419 |
| 16 | 16 | 0.001000 | 0.719280 | 0.637275 | 0.082005 | 0.001390 |
| 32 | 2 | 0.007000 | 0.734638 | 0.656180 | 0.078458 | 0.009529 |
| 32 | 4 | 0.007000 | 0.657281 | 0.578392 | 0.078889 | 0.010650 |
| 32 | 8 | 0.011000 | 0.718779 | 0.638307 | 0.080472 | 0.015304 |
| 32 | 16 | 0.008000 | 0.720842 | 0.644187 | 0.076655 | 0.011098 |
| 32 | 32 | 0.007000 | 0.730370 | 0.648315 | 0.082055 | 0.009584 |
| 64 | 2 | 0.067000 | 1.195338 | 1.098235 | 0.097103 | 0.056051 |
| 64 | 4 | 0.063000 | 0.832303 | 0.755027 | 0.077276 | 0.075694 |
| 64 | 8 | 0.063000 | 0.861127 | 0.771678 | 0.089449 | 0.073160 |
| 64 | 16 | 0.062000 | 0.841280 | 0.756640 | 0.084640 | 0.073697 |
| 64 | 32 | 0.062000 | 1.281141 | 1.188366 | 0.092775 | 0.048394 |
| 128 | 2 | 0.941000 | 1.310146 | 1.161996 | 0.148150 | 0.718241 |
| 128 | 4 | 0.948000 | 1.276472 | 1.179509 | 0.096963 | 0.742672 |
| 128 | 8 | 0.951000 | 1.266602 | 1.160512 | 0.106090 | 0.750828 |
| 128 | 16 | 0.964000 | 1.283926 | 1.184268 | 0.099658 | 0.750822 |
| 128 | 32 | 0.948000 | 1.273608 | 1.166415 | 0.107193 | 0.744342 |
| 256 | 2 | 10.386000 | 3.574534 | 2.940035 | 0.634499 | 2.905554 |
| 256 | 4 | 10.682000 | 3.197030 | 2.946667 | 0.250363 | 3.341226 |
| 256 | 8 | 10.412000 | 3.083035 | 2.913314 | 0.169721 | 3.377192 |
| 256 | 16 | 10.228000 | 3.067516 | 2.893718 | 0.173798 | 3.334294 |
| 256 | 32 | 10.351000 | 3.079268 | 2.904528 | 0.174740 | 3.361513 |
| 512 | 2 | 214.921005 | 5.985271 | 1.419933 | 4.565337 | 35.908318 |
| 512 | 4 | 215.509995 | 2.608099 | 1.372364 | 1.235735 | 82.631065 |
| 512 | 8 | 213.274994 | 2.039825 | 1.366142 | 0.673683 | 104.555534 |
| 512 | 16 | 213.125000 | 2.079951 | 1.424923 | 0.655028 | 102.466362 |
| 512 | 32 | 214.619003 | 2.081383 | 1.445752 | 0.635631 | 103.113655 |
| 1024 | 2 | 3922.832031 | 38.092010 | 2.255702 | 35.836308 | 102.983063 |
| 1024 | 4 | 4308.101074 | 11.823953 | 2.267514 | 9.556438 | 364.353729 |
| 1024 | 8 | 4340.241211 | 7.191860 | 2.378604 | 4.813256 | 603.493530 |
| 1024 | 16 | 4046.583008 | 7.150482 | 2.135546 | 5.014936 | 565.917542 |
| 1024 | 32 | 4368.100098 | 7.328420 | 2.202403 | 5.126017 | 596.049377 |
| 2048 | 2 | 39662.906250 | 391.232574 | 8.024073 | 383.208496 | 101.379356 |
| 2048 | 4 | 39876.015625 | 105.535301 | 8.106600 | 97.428703 | 377.845276 |
| 2048 | 8 | 39983.656250 | 57.436951 | 8.265071 | 49.171883 | 696.131226 |
| 2048 | 16 | 39673.023438 | 57.849400 | 8.109948 | 49.739452 | 685.798340 |
| 2048 | 32 | 39718.160156 | 57.886402 | 7.978932 | 49.907467 | 686.139709 |

## Graphs

> Charts are generated with Chart.js. If you want that code, let me know

**Fig. 1: CPU vs GPU time**

<img src="https://raw.githubusercontent.com/JairusSW/CSC370/refs/heads/master/charts/cpu-vs-gpu-total-time.svg">

**Fig. 2: Block size vs GPU time**

<img src="https://raw.githubusercontent.com/JairusSW/CSC370/refs/heads/master/charts/gpu-processing-vs-block-size.svg">

**Fig. 3: Transfer vs GPU Time**

<img src="https://raw.githubusercontent.com/JairusSW/CSC370/refs/heads/master/charts/transfer-vs-gpu-processing.svg">
  
## Analysis

First, it should be noted that for *Fig. 1*, CPU Time hits both an upper and lower limit, so when it shows `0.01`, it actually means sub-0.01 and when 500, it means plus-500.
When multiplying smaller (<128 width) matrices, the CPU time clearly beats the GPU time (Fig. 1). The primary reasons for this are:
1. GPUs are optimized for extreme parallelism. A small matrix cannot be split up into worthwhile chunks across many threads, so the GPU regresses performance.
2. Crossing the memory bounds between Host and Device memory likely takes more time than the entire computation itself, so most of the results are initializing the kernel, transferring data, multiplying, and transferring back.

In the professional world, I run into this problem a lot. Typically, I write lots of high-performance WebAssembly libraries and runtimes. The main factor in deciding whether some code is worth running in WebAssembly is exactly the same: if the transfer time exceeds or equals the computation time, then it's likely not beneficial. The same applies to GPUs, which is why we are seeing these results.

However, when providing the GPU with enough workload so that transfer time < computation time, the handles it perfectly. Taking another look at Fig. 1, the CPU and GPU time intersects at a x-coordinate of around 150. That means that somewhere between a matrix width of 128 and 256, the transfer overhead is superceded by the gpu time (or rather ability to chunk and parallelize data).

Another reason is WARPs. Even though I'm running a small compatibility layer, SCALE still creates a WARP-equivalent of 32-threads (I looked it up and it's called a wavefront and on my system, it has 32 threads https://youtu.be/uu-3aEyesWQ?t=184). The problem is that both a 2x2 and 4x4 block size cannot fully fill a WARP, which means that they do not fully take advantage of the hardware. Say if I ran this matrix multiplication algorithm with a 4x4 block size, it would only fill half a warp. Now, if I ran it in 8x8 blocks, it would take 64 threads which takes full advantage of two WARPs. If we take a look at the actual data, we find that for 6/10 of the time (with 2 of those 10 being invalid aka negative speedup, so in reality, 6/8), an 8x8 block size outperforms all other runs.

This though, begs the question: if say, I use a block size of 16x16 (8 WARPs), and matrix width of 2048, would it not be faster since it utilizes 8 WARPs simulaneously? In Fig. 1, we see that after a 8x8 block configuration, results sort of plateu, but if we take a look at Fig. 3, we see that the data transfer time nearly triples between 1024 and 2048. In all honesty though, I'm not too certain. My best guess is that the tail section of each computation only uses about half the allocated WARPs which degrades performance. (Do you have any insights into this, professor?)

If we take a look at complexity, both the CPU and GPU implementations do the same amount of work, so they run at O(n^3) complexity. The difference is that the GPU is able to distribute that load across thousands of threads. (My system has around 200k threads, so it has plenty of room), so it can effectively spread that complexity and run at a constant rate (which is why we see results plateu at the end). For the GPU, space complexity is also a problem, which seems to increase at rate of something like O(n^2) or so. Again, the GPU is able to compensate for this because it also spreads that O(n^2) complexity across the same threads. Pretty cool. That said, if a large enough matrix isn't provided, both the time and space complexity can't be properly distributed which hurts performance a lot.
