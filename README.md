# P3 - Matrix Multiplication with CUDA
The objective of this assignment is to write a program that utilizes CUDA and a GPU to multiply two square matrices in parallel. Once you have a working solution, you will implement memory enhancements to further speed up the program.

## Overview
The skeleton code in p3_mmult.cu will do the following for you:
- Provide input flags for block size and matrix width
- Generate random integer data for matrix A and B.
- Calculate C = A * B on the CPU
- Provide the signature for GPU kernel MatrixMultCUDA() that will calculate matrix D = A * B on the GPU.
- Compare C and D to ensure GPU calculations are correct
- Provide timing comparisons to show GPU speedup over CPU.

## Programming Objectives
The project contains two parts with part 1 having five TODO tasks for you to implement.  Part two will take your working part 1 code and make performance modifications to it.

### Part 1
- Task 1 - Allocate memory on the GPU for the input and output matrices. Use the pointer variables declared in this section.

- Task 2 - Set the grid and block sizes for the GPU kernel by using the flag values

- Task 3 - Properly free all data 

- Task 4- Implement the MatrixMultGPU() CUDA kernel that performs the matrix mutiplication and stores the result in GPU global memory in buffer D.

- Task 5 - Send the GPU calculated matrix to the host for validation

### Part 2
In part 2, you will take your working file from part 1 and make a copy of it called pr3_mmult_unified.cu. There are a couple taks to perform:

- Task 1 - modify your memory allocation to use pinned memory.

- Task 2 - modify the memory allocation to use unified memory along with your pinned memory.


## Compiling and Running the Code

The code will check that the number of threads divides evenly into the size of the matrix.

### Compiling the Code
If you want to compile the code to generate the executables:

```
nvcc -x cu pr3_mmult.cu -o pr3_mmult
```
and
```
nvcc -x cu pr3_mmult_memory.cu -o pr3_mmult_memory
```

### Run the Code
The code is run from the command line. You can see the input flag options by compiling and running:

```
./pr3_mmult -b <block size> -m <matrix width>
```

### Verify Code
Running the code with valid block sizes and matrix widths will provide immediate results.


### Report file
You will provide a report that analyzes performance of your implementation. You will vary block size and matrix widths and collect CPU time, GPU total time, Total data tarnsfer time (to and from the GPU), and GPU processing time.

You will vary the matrix width from 4 to 2048.  You will vary the block size from 2 to 32.  Use sizes 2, 4, 8, 16, and 32.  **NOTE:** the block size must be less than or equal to the matrix width.

Provide graphical output that shows your findings and relationships in the data.

Comment on the data and provide your thoughts on why the data looks like it does. The report should be one to two pages.

## Code Submission / Citations
When your code is complete, you will upload your **pr3_mmult.cu**, **pr3_mmult_unified.cu** and **report.pdf** files to e-Learning. 

>**DO NOT** zip the files into a .zip file and upload the .zip file.  Upload the three individual files in one submission. Significant points will be deducted if a zip file is submitted.

At the top of your code files, complete the Citations section for all resources you consulted in writing your code. Failure to do so could result in an academic integrity violation if similar code is found from other sources.

## Grading
Your grade will be calculated from the results of my grade.py script. 

| Task | Point Value |
| ---- | ----------- |
| Part 1 1 | 50% |
| Part2 2 | 35% |
| Report | 15% |
| **TOTAL** | **100%** |

>There will be a separate code check to ensure the implementation follows the rules, is not AI generated, or duplicates all or part of some other submission.  If academic integrity issues are found, the penalty will be, at a minimum, a zero for the project.

## Resources
Here are some resources you may find helpful as you develop your code.

- Matrix Multiplication (also known as the dot product)- https://www.mathsisfun.com/algebra/matrix-multiplying.html
- CUDA programming guide - https://docs.nvidia.com/cuda/cuda-programming-guide/index.html

