# Guide de deploiement

## Prerequis serveur

- Linux (Ubuntu 22+, Debian 12+, Rocky 9+)
- Docker Engine 24+ et Docker Compose v2
- Ports 80 et 443 ouverts
- Acces SSH
- Nom de domaine pointe vers l'IP du serveur

### Installation Docker (une seule fois)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Reconnexion SSH pour appliquer le groupe
```

### Firewall (une seule fois)

```bash
# Ubuntu/Debian
sudo apt install -y ufw fail2ban
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Rocky/AlmaLinux
sudo dnf install -y firewalld fail2ban
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## Premier deploiement

### 1. Cloner le projet

```bash
git clone <repo-url> /app
cd /app
```

### 2. Configurer l'environnement

```bash
cp deploy/env/.env.production.example .env
nano .env
```

Variables a modifier obligatoirement :
- `DOMAIN` : le nom de domaine (ex: `app.client.com`)
- `POSTGRES_USER` / `POSTGRES_DB` : noms specifiques au client
- `FRONTEND_URL` : `https://<DOMAIN>`
- `CORS_ORIGINS` : `https://<DOMAIN>`
- `DEFAULT_ADMIN_EMAIL` : email de l'admin principal
- `SMTP_*` : configuration email (si `EMAIL_ENABLED=true`)

### 3. Generer les secrets

```bash
chmod +x deploy/scripts/*.sh
./deploy/scripts/init-secrets.sh
```

Puis mettre a jour le `.env` avec les valeurs generees :

```bash
# Lire les passwords generes
echo "POSTGRES_PASSWORD=$(cat secrets/postgres_password)"
echo "REDIS_PASSWORD=$(cat secrets/redis_password)"

# Editer .env
nano .env
# POSTGRES_PASSWORD=<copier la valeur>
# REDIS_URL=redis://:<copier redis_password>@redis:6379/0
# REDIS_PASSWORD=<copier la valeur>
```

### 4. Obtenir le certificat SSL

```bash
./deploy/scripts/init-ssl.sh <DOMAIN> <EMAIL>
# Exemple: ./deploy/scripts/init-ssl.sh app.client.com admin@client.com
```

> **Note Cloudflare** : si Cloudflare est devant le serveur, configurer le mode SSL
> en "Full (Strict)" dans le dashboard Cloudflare. Le certificat Let's Encrypt
> sur le serveur sera utilise entre Cloudflare et l'origine.

### 5. Demarrer le stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 6. Verifier

```bash
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# Tous les services sont healthy ?
$COMPOSE ps

# API repond ?
curl -s https://<DOMAIN>/api/health
# Attendu: {"status":"ok","service":"Template API"}

# Frontend charge ?
curl -s https://<DOMAIN> | head -5
# Attendu: <!DOCTYPE html>...
```

### 7. Personnaliser (admin UI)

1. Aller sur `https://<DOMAIN>`
2. Se connecter avec `DEFAULT_ADMIN_EMAIL` (mot de passe defini au premier login)
3. **Parametres** (`/admin/settings`) : nom, logo, couleurs, favicon
4. **Features** (`/admin/features`) : activer/desactiver les modules
5. **Feature flags** (`/admin/feature-flags`) : rollout progressif

---

## Mise a jour

### Manuelle (SSH)

```bash
cd /app
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

git pull origin main
$COMPOSE build
$COMPOSE up -d --no-deps --force-recreate api
# Attendre que l'API soit healthy (migrations auto au demarrage)
sleep 10
$COMPOSE up -d --no-deps --force-recreate worker
$COMPOSE up -d --no-deps --force-recreate app
$COMPOSE up -d --no-deps --force-recreate nginx
docker image prune -f
```

### Automatique (GitHub Actions)

1. Configurer les **secrets GitHub** du repo :
   - `SSH_HOST` : IP du serveur
   - `SSH_USER` : utilisateur SSH
   - `SSH_KEY` : cle privee SSH (contenu du fichier `~/.ssh/id_ed25519`)
   - `SSH_PORT` : port SSH (defaut: 22)
   - `APP_DIR` : chemin du projet (defaut: `/app`)

2. Lancer : GitHub → Actions → **Deploy** → Run workflow
   - Choisir `target: ssh`
   - Choisir `environment: staging` ou `production` ou `recette`

Le workflow fait : pull → build → migrations → rolling update (API → worker → app → nginx).

---

## Commandes utiles

```bash
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# Logs d'un service
$COMPOSE logs -f api
$COMPOSE logs -f nginx
$COMPOSE logs --tail=100 worker

# Restart un service
$COMPOSE restart api

# Etat de sante
$COMPOSE ps

# Shell dans un container
$COMPOSE exec api bash
$COMPOSE exec db psql -U $POSTGRES_USER -d $POSTGRES_DB

# Backup manuel
./deploy/scripts/backup.sh

# Renouveler le certificat SSL manuellement
$COMPOSE exec certbot certbot renew --force-renewal
$COMPOSE exec nginx nginx -s reload
```

---

## Rollback

En cas de probleme apres une mise a jour :

```bash
cd /app
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# Revenir au commit precedent
git log --oneline -5  # identifier le bon commit
git checkout <commit-hash>

# Rebuild et redemarrer
$COMPOSE build
$COMPOSE up -d --no-deps --force-recreate api worker app nginx
```

> **Attention** : si une migration Alembic a ete appliquee, il faut la reverter
> manuellement : `$COMPOSE exec api alembic -c alembic/alembic.ini downgrade -1`
