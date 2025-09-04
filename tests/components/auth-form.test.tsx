import { render, screen } from '@testing-library/react';
import { AuthForm } from '@/components/auth-form';

describe('AuthForm', () => {
  it('renders email and password fields', () => {
    render(
      <AuthForm
        type="login"
        onSubmit={async () => {}}
        onGoogleClick={async () => {}}
        loading={false}
      />,
    );

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});
