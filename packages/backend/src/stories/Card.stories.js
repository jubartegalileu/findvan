/* eslint-env browser */

export default {
  title: 'Core Components/Card',
  tags: ['autodocs'],
  render: ({ title, description }) => {
    const wrapper = document.createElement('section');
    wrapper.className = 'card';

    const h3 = document.createElement('h3');
    h3.textContent = title;

    const p = document.createElement('p');
    p.textContent = description;

    wrapper.append(h3, p);
    return wrapper;
  },
  args: {
    title: 'Painel inicial',
    description: 'Exemplo de componente base para iniciar o design system.',
  },
};

export const Default = {};
