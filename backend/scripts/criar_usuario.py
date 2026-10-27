"""Cria usuário no Supabase Auth + perfil.

python -m scripts.criar_usuario --email voce@exemplo.com --nome "Seu Nome" --papel admin
"""
import argparse
import getpass
import sys

from app.core.auth import get_db
from app.core.config import settings


def buscar_usuario_por_email(db, email: str):
    pagina = 1
    while True:
        usuarios = db.auth.admin.list_users(page=pagina, per_page=1000)
        for usuario in usuarios:
            if (usuario.email or "").lower() == email:
                return usuario
        if len(usuarios) < 1000:
            return None
        pagina += 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Cria um usuário do UtilGás")
    parser.add_argument("--email", required=True)
    parser.add_argument("--nome", required=True)
    parser.add_argument("--papel", choices=["admin", "operador"], default="operador")
    args = parser.parse_args()

    if not settings.supabase_url or not settings.supabase_service_key:
        print("Preencha SUPABASE_URL e SUPABASE_SERVICE_KEY no backend/.env antes.")
        return 1

    email = args.email.strip().lower()
    db = get_db()

    usuario = buscar_usuario_por_email(db, email)
    if usuario:
        print(f"{email} já existe, senha mantida.")
    else:
        senha = getpass.getpass("Senha do novo usuário (mín. 6 caracteres): ")
        if len(senha) < 6:
            print("A senha precisa ter pelo menos 6 caracteres.")
            return 1
        if senha != getpass.getpass("Repita a senha: "):
            print("As senhas não conferem.")
            return 1
        usuario = db.auth.admin.create_user(
            {"email": email, "password": senha, "email_confirm": True}
        ).user
        print(f"Usuário criado: {email}")

    db.table("perfis").upsert(
        {"id": usuario.id, "nome": args.nome.strip(), "papel": args.papel, "ativo": True}
    ).execute()
    print(f"Perfil ok: {args.nome.strip()} ({args.papel})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
