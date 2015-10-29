// console.log('Hello Pocket Scrape!');
import {sayHello} from './src/thing';

const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
for (let i = nums.length - 1; i >= 0; i = i - 1) {
  console.log('for -- %s', nums[i]);
}

nums.forEach(v => {
  if (v % 5 == 0) {
    console.log('arrow.fives -- %s', v);
  }
});

const names = ['Dan', 'Don'];
names.forEach(v => {
  console.log('greet -- %s', sayHello(v));
});
