// System includes
#include <stdio.h>
#include <assert.h>
#include <iostream>
#include <cstring> // Added for strcmp
#include <ctime>
#include <chrono>

// CUDA runtime
#include <cuda_runtime.h>
#include <cuda_profiler_api.h>

// Set DEBUG to 1 for debug messages
#define DEBUG 0

// Function to compare result matrices from CPU and GPU
bool compareMatrices(int *C, int *D, int size)
{
    for (int i = 0; i < size; ++i)
    {
        int error = std::abs(C[i] - D[i]);
        if (error > 1e-3)
        {
            return false;
        }
    }
    return true;
}

// Function to initialize matrices A and B
void initializeMatrices(int *matrix, int size)
{
    for (int i = 0; i < size; ++i)
    {
        matrix[i] = rand() % 10;
    }
}

// CPU implementation
void matrixMultiplication(int *A, int *B, int *D, int w)
{
    for (int i = 0; i < w; ++i)
    {
        for (int j = 0; j < w; ++j)
        {
            int sum = 0.0;
            for (int k = 0; k < w; ++k)
            {
                sum += A[i * w + k] * B[k * w + j];
            }
            D[i * w + j] = sum;
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
// Do not modify code above this line
////////////////////////////////////////////////////////////////////////////////////////////////////////

// GPU implementation
// A & B are addresses on the host for input matrices, C is the address on the host for output matrix
// matrixWidth is the width of matrices for which matrix multiplication is being performed
__global__ void MatrixMulCUDA(int *D, int *A, int *B, int matrixWidth)
{
    /** TODO: Task 4: Implement a matrix multiplication kernel using global memory **/
    
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
// Do not modify code below this line except in the TODO sections
////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Program main
 */
int main(int argc, char **argv)
{
    srand(33); // fr5ffffffffrrrrfv5rr (time(NULL));

    if (argc != 5 || strcmp(argv[1], "-b") != 0)
    {
        std::cout << "Usage: ./a.out -b <block size> -m <matrix width>" << std::endl;
        std::cout << "  NOTE: <matrix width> should be an even multiple of your <block size>" << std::endl;
        return -1;
    }

    float h2dTime = 0;
    float d2hTime = 0;
    float gpuTime = 0;
    float cpuTime = 0;

    // These will be used to set the gpuGrid and gpuBlock sizes
    int blockSize = atoi(argv[2]);
    int matrixWidth = atoi(argv[4]);

    if (matrixWidth % blockSize != 0){
        printf("Block size not an even multiple of matrix width\n");
        return -1;
    }


    int matrixSize = matrixWidth * matrixWidth;

    int *A, *B, *C, *D;
    A = (int *)malloc(matrixSize * sizeof(int));
    B = (int *)malloc(matrixSize * sizeof(int));
    C = (int *)malloc(matrixSize * sizeof(int));
    D = (int *)malloc(matrixSize * sizeof(int));

    initializeMatrices(A, matrixSize);
    initializeMatrices(B, matrixSize);

    cudaEvent_t start, stop;
    cudaEventCreate(&start);
    cudaEventCreate(&stop);
    cudaEventRecord(start);

    /** TODO: Task 1 - allocate memory on the GPU and copy matrix data to the GPU */
    int *d_A, *d_B, *d_D;
    
    /** End Task 1 */

    cudaEventRecord(stop);
    cudaEventSynchronize(stop);
    cudaEventElapsedTime(&h2dTime, start, stop);

    /***** TODO: Task 2: Set grid and block sizes for the GPU kernel *****/

    /** End Task 2 */

    cudaEventRecord(start);

    // Launch the kernel
    MatrixMulCUDA<<<gpuGridSize, gpuBlockSize>>>(d_D, d_A, d_B, matrixWidth);

    cudaEventRecord(stop);
    cudaEventSynchronize(stop);
    cudaEventElapsedTime(&gpuTime, start, stop);
    cudaEventRecord(start);

    /** TODO: Task 5: Retrieve GPU Data into "D" **/

    /** End Task 5 */

    cudaEventRecord(stop);
    cudaDeviceSynchronize();
    cudaEventElapsedTime(&d2hTime, start, stop);

    // Perform matrix multiplication on CPU and store in C
    auto start_time = std::chrono::high_resolution_clock::now();
    matrixMultiplication(A, B, C, matrixWidth);
    auto end_time = std::chrono::high_resolution_clock::now();
    cpuTime = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time).count();
    cpuTime = cpuTime / 1000;

    auto gpuTotalTime = d2hTime + gpuTime + h2dTime;

    // End Perform matrix multiplication on CPU and store in D

    // Compare matrices C and D
    if (DEBUG == 1)
    {
        for (int i = 0; i < matrixSize; i++)
        {
            printf("%d, ", A[i]);
        }
        printf("\n");
        for (int i = 0; i < matrixSize; i++)
        {
            printf("%d, ", B[i]);
        }
        printf("\n");
        for (int i = 0; i < matrixSize; i++)
        {
            printf("%d, ", C[i]);
        }
        printf("\n");
        for (int i = 0; i < matrixSize; i++)
        {
            printf("%d, ", D[i]);
        }
        printf("\n");
    }

    bool matricesMatch = compareMatrices(C, D, matrixSize);

    if (matricesMatch)
    {
        printf("SUCCESS!\n");
        printf("CPU Matrix Multiply Time (ms) : %f \n", cpuTime);

        printf("D2HTransfer Time (ms) : %f \n", h2dTime);
        printf("GPU Kernel Multiply Time (ms) : %f \n", gpuTime);
        printf("H2D Transfer Time (ms) : %f \n", d2hTime);

        printf("GPU Total Time (ms) : %f \n", gpuTotalTime);

        printf("Speedup: %f \n", cpuTime / gpuTotalTime);
    }
    else
    {
        printf("ERROR! Matrices do not match.\n");
    }

    /** Task 3 - Free Memory for A, B, C, D */

    /** End Task 3 */

    return 0;
}
