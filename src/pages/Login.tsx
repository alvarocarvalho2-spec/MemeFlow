import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

const schema = z.object({ email: z.string().email('Email inválido'), password: z.string().min(6, 'Mínimo 6 caracteres') });
type Form = z.infer<typeof schema>;

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });
  async function onSubmit(values: Form) {
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) return toast.error(error.message);
    toast.success('Bem-vindo de volta!');
    navigate((location.state as any)?.from || '/');
  }
  return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle className="text-3xl text-gradient">Entrar</CardTitle><CardDescription>Acesse seu feed de memes personalizado.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={handleSubmit(onSubmit)}><div><Input placeholder="email@exemplo.com" {...register('email')} /><p className="text-xs text-destructive">{errors.email?.message}</p></div><div><Input type="password" placeholder="Senha" {...register('password')} /><p className="text-xs text-destructive">{errors.password?.message}</p></div><Button className="w-full" variant="gradient" disabled={isSubmitting}>{isSubmitting ? 'Entrando...' : 'Entrar'}</Button></form><div className="mt-4 flex justify-between text-sm"><Link className="text-primary hover:underline" to="/register">Criar conta</Link><Link className="text-primary hover:underline" to="/forgot-password">Esqueci a senha</Link></div></CardContent></Card></div>;
}
