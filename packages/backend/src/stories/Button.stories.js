import { createButton } from './Button';

export default {
  title: 'Base Components/Button',
  render: (args) => createButton(args),
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    primary: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Salvar',
    primary: false,
    disabled: false,
  },
};

export const Default = {};

export const Primary = {
  args: {
    label: 'Continuar',
    primary: true,
  },
};

export const Disabled = {
  args: {
    label: 'Indisponivel',
    disabled: true,
  },
};
