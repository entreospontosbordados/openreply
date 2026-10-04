<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Variáveis de ambiente

Nunca adicione ao Git nem faça commit de arquivos `.env`, `.env.*` ou valores de variáveis de ambiente, incluindo credenciais, tokens e segredos. Exemplos de configuração devem conter apenas nomes de variáveis e valores fictícios, nunca valores reais.

Antes de cada commit, revise o diff staged e o conteúdo dos arquivos que serão commitados para verificar se contêm informações confidenciais, secrets, passwords, tokens, chaves de API, chaves privadas ou outras credenciais. Se encontrar qualquer informação sensível ou houver dúvida sobre sua confidencialidade, não faça o commit até removê-la ou substituí-la por um valor fictício seguro. Não exponha os valores encontrados em logs, mensagens ou descrições de commit.

# Docker

Execute todos os comandos Docker com `sudo -n docker` em vez de `docker`. Para Docker Compose, use `sudo -n docker compose`, por exemplo: `sudo -n docker compose up -d`.
