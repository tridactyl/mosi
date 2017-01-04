import { init, net } from 'mosi/lib/cs';

const actions = (src) => ({
  COUNT: (count) => {
    document.getElementById('count').innerText = count;
  }
});

const subscriptions = ['count'];

init(actions, subscriptions);

/* create GUI */
const view = document.createElement('table');
view.setAttribute('style',
  `z-index: 99999;
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 200px;
  background-color: white;`);
view.innerHTML = `
  <tr style='white-space: nowrap;'>
    <td><button id='increment'>Increment</button></td>
    <td id='count' style='text-align: right; min-width: 120px;'></td>
  </tr>`;
document.body.appendChild(view);

/* Add Listener */
document.getElementById('increment').addEventListener('click', () => {
  net('bp').msg('INCREMENT');
});
