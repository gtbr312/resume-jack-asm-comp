# Jack Assembler and Compiler

The Jack Assembler is a program which takes in code for a simplistic virtual machine and outputs machine code intended for a 16 bit processor. The specifications for the machine code are informed by a distinct project in which I constructed a theoretical 16 bit processor in a HDL. The Jack Compiler intakes a file or repositories of files written in Jack and converts it to the Jack Virtual Machine language. These two processes run in sequence take the high level OOP language of Jack and translate it into a 16 bit machine code language. 

## Instructions
Both the Assembler and Compiler folders contain their respective programs with an IO file dedicated to the content to be processed by the assembler and compiler. In addition to generating virtual machine code, the compiler will generate an XML tree of the program. The output of the compiler will be written to files in dedicated folders, rather than back into the IO folder.
