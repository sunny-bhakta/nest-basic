import { HttpStatus } from '@nestjs/common';

// Test what HttpStatus[400] returns
console.log('HttpStatus[400]:', HttpStatus[400]);
console.log('HttpStatus[401]:', HttpStatus[401]);
console.log('HttpStatus[404]:', HttpStatus[404]);
console.log('HttpStatus[500]:', HttpStatus[500]);

// List all HttpStatus enum values
console.log('All HttpStatus values:');
Object.keys(HttpStatus).forEach(key => {
  if (isNaN(Number(key))) {
    console.log(`${key}: ${HttpStatus[key]}`);
  }
});