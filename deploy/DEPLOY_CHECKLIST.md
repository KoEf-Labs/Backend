# Deploy Checklist

## Sunucu Kurulumu (Hetzner VPS)

### 1. SSH Bağlantısı
```bash
ssh root@SUNUCU_IP
```

### 2. Sistem Güncelleme
```bash
apt update && apt upgrade -y
```

### 3. Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v  # 20.x
```

### 4. PM2
```bash
npm install -g pm2
pm2 startup  # systemd ile otomatik başlatma
```

### 5. PostgreSQL
```bash
apt install -y postgresql postgresql-contrib
sudo -u postgres psql
# CREATE DATABASE website_builder;
# CREATE USER appuser WITH ENCRYPTED PASSWORD 'GUCLU_SIFRE';
# GRANT ALL PRIVILEGES ON DATABASE website_builder TO appuser;
# \q
```

### 6. Redis
```bash
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
redis-cli ping  # PONG
```

### 7. Nginx
```bash
apt install -y nginx
systemctl enable nginx
```

### 8. Proje Deploy
```bash
mkdir -p /var/www/website-builder
mkdir -p /var/www/sites
mkdir -p /var/log/pm2

cd /var/www/website-builder
git clone https://github.com/KoEf-Labs/Backend.git .
npm install --production
cp deploy/.env.production .env
# .env dosyasındaki değerleri düzenle!

npx prisma db push
npm run build
pm2 start ecosystem.config.js
pm2 save
```

### 9. Nginx Config
```bash
cp deploy/nginx.conf /etc/nginx/sites-available/website-builder
ln -s /etc/nginx/sites-available/website-builder /etc/nginx/sites-enabled/
# nginx.conf içindeki YOURDOMAIN.com'u gerçek domain ile değiştir
nginx -t
systemctl reload nginx
```

### 10. SSL (Cloudflare veya Let's Encrypt)
```bash
# Let's Encrypt:
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.YOURDOMAIN.com -d "*.YOURDOMAIN.com"
```

### 11. JWT Keys Oluştur
```bash
cd /var/www/website-builder
npx tsx scripts/generate-keys.ts
# Çıkan private/public key'leri .env'ye yapıştır
```

### 12. DNS (Cloudflare)
- A record: `api` → SUNUCU_IP
- A record: `*` → SUNUCU_IP (wildcard)
- Proxy: ON (turuncu bulut)

### 13. Flutter App
```bash
# Local makinede:
cd Mobil
flutter build ios --dart-define=API_BASE_URL=https://api.YOURDOMAIN.com
flutter build appbundle --dart-define=API_BASE_URL=https://api.YOURDOMAIN.com
```

### 14. Test
- [ ] API erişilebilir: `curl https://api.YOURDOMAIN.com/api/site/themes`
- [ ] Register çalışıyor
- [ ] Login çalışıyor
- [ ] Email verification kodu geliyor
- [ ] Proje oluşturma çalışıyor
- [ ] Image upload çalışıyor
- [ ] Publish çalışıyor
- [ ] Admin approve → static HTML oluşuyor
- [ ] Subdomain erişilebilir: `http://testsite.YOURDOMAIN.com`
- [ ] Mobile app production build çalışıyor
