import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

const schema = z.object({ username: z.string().min(3).regex(/^[a-z0-9_]+$/, 'Use apenas minúsculas, números e _'), full_name: z.string().min(2, 'Informe seu nome'), email: z.string().email(), password: z.string().min(6) });
type Form = z.infer<typeof schema>;

export function Register() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });
  async function onSubmit(values: Form) {
    const { error } = await supabase.auth.signUp({ email: values.email, password: values.password, options: { data: { username: values.username, full_name: values.full_name }, emailRedirectTo: `${location.origin}/` } });
    if (error) return toast.error(error.message);
    toast.success('Cadastro criado. Confirme seu email se necessário.');
    navigate('/login');
  }
  return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle className="text-3xl text-gradient">Criar conta</CardTitle><CardDescription>Entre para postar, curtir e conversar.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={handleSubmit(onSubmit)}><Input placeholder="username" {...register('username')} /><p className="text-xs text-destructive">{errors.username?.message}</p><Input placeholder="Nome completo" {...register('full_name')} /><p className="text-xs text-destructive">{errors.full_name?.message}</p><Input placeholder="email@exemplo.com" {...register('email')} /><p className="text-xs text-destructive">{errors.email?.message}</p><Input type="password" placeholder="Senha" {...register('password')} /><p className="text-xs text-destructive">{errors.password?.message}</p><Button className="w-full" variant="gradient" disabled={isSubmitting}>{isSubmitting ? 'Criando...' : 'Cadastrar'}</Button></form><p className="mt-4 text-sm">Já tem conta? <Link className="text-primary hover:underline" to="/login">Entrar</Link></p></CardContent></Card></div>;
}
