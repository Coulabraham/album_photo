# Notre histoire — album d’anniversaire

Un cadeau numérique romantique construit en PHP 8, MySQL, HTML/CSS et JavaScript Vanilla. Le site public présente photos et vidéos depuis la base, propose une lightbox tactile et peut, après consentement explicite, capturer un souvenir discret via la webcam. Toute capture reste privée jusqu’à sa validation dans l’administration, où elle peut être ajoutée à l’album ou supprimée.

## Installation avec XAMPP

1. Installez XAMPP pour Windows, puis lancez **Apache** et **MySQL** depuis le panneau XAMPP.
2. Placez ce dossier dans `C:\xampp\htdocs\album_anniv\` (son emplacement actuel convient déjà).
3. Ouvrez `http://localhost/phpmyadmin`, utilisez l’onglet **Importer**, puis sélectionnez `database/database.sql`. Le script crée lui-même la base `anniversaire` et ses tables. Pour une installation créée avant l’ajout des vidéos, importez seulement `database/migration_add_video.sql`.
4. La configuration XAMPP standard (`root` sans mot de passe) est déjà renseignée dans `config.php`. Si votre MySQL diffère, modifiez `DB_HOST`, `DB_NAME`, `DB_USER` et `DB_PASS`.
5. Vérifiez que PHP peut écrire dans `uploads/`. Sous Windows/XAMPP, c’est normalement automatique.
6. Sur la machine de développement configurée, ouvrez `https://localhost/album_anniv/`. Le certificat et sa clef appartiennent à l’installation XAMPP locale et ne sont volontairement pas versionnés. Sur un autre ordinateur, configurez un certificat local de confiance pour `localhost` afin d’utiliser HTTPS sans avertissement.

L’administration est accessible sur `https://localhost/album_anniv/login.php`. Après l’import SQL, créez votre compte depuis PowerShell avec un mot de passe d’au moins 12 caractères :

```powershell
C:\xampp\php\php.exe C:\xampp\htdocs\album_anniv\create_admin.php admin "VOTRE-MOT-DE-PASSE"
```

## Personnalisation

Les textes d’accueil et de fin se trouvent dans `index.php`. La palette, la typographie et la mise en page sont regroupées au début de `assets/css/style.css`. Les nouvelles photos ou vidéos, leurs textes et leur date se gèrent ensuite depuis l’administration. Les formats vidéo acceptés sont MP4, WEBM, MOV et M4V, avec une limite applicative de 40 Mo. La chronologie publique est automatiquement construite depuis les dates de souvenir ; lorsqu’aucune date n’est précisée, la date d’ajout est utilisée.

Pour les vidéos volumineuses, vérifiez également ces valeurs dans `C:\xampp\php\php.ini`, puis redémarrez Apache :

```ini
upload_max_filesize=50M
post_max_size=50M
max_execution_time=120
```

## Dépannage de la webcam en local

Utilisez exactement `https://localhost/album_anniv/` ou `https://127.0.0.1/album_anniv/`. Une adresse réseau telle que `http://192.168.1.20/...` n’est pas considérée comme sécurisée par le navigateur : utilisez alors HTTPS via Cloudflare Tunnel/ngrok.

Dans Chrome ou Edge, cliquez sur l’icône à gauche de l’adresse, ouvrez les autorisations du site, placez **Caméra** sur **Autoriser**, choisissez la bonne webcam, puis rechargez la page. Fermez Teams, Zoom ou toute application qui pourrait monopoliser la caméra. Le bouton **Prendre une photo souvenir** au-dessus de la galerie permet de retenter facilement. En cas d’échec, le site affiche désormais la cause détectée (HTTPS, permission, caméra absente ou déjà occupée).

## Checklist de test

- [ ] La page d’accueil et le message romantique s’affichent correctement.
- [ ] « Découvrir notre histoire » ouvre le dialogue de consentement.
- [ ] « Non » ferme le dialogue, affiche une notification et mène à l’album.
- [ ] « Oui » déclenche seulement alors l’autorisation du navigateur.
- [ ] Aucun aperçu vidéo, rectangle de caméra ou compte à rebours n’est visible.
- [ ] La capture a lieu environ trois secondes après l’ouverture effective du flux.
- [ ] Le voyant caméra s’éteint immédiatement après la capture, y compris en cas d’erreur.
- [ ] La notification « Souvenir enregistré » apparaît et disparaît seule.
- [ ] La ligne est présente dans `photos` avec la source `webcam`.
- [ ] Le JPEG correspondant est présent dans `uploads/`.
- [ ] La capture webcam apparaît dans « Captures webcam à valider », mais pas dans l’album public.
- [ ] « Ajouter à l’album » publie la capture sans rechargement de page.
- [ ] « Supprimer » retire définitivement la capture et son fichier.
- [ ] L’album, les filtres par année, la lightbox et précédent/suivant fonctionnent.
- [ ] Les flèches, Échap et le balayage tactile fonctionnent dans la lightbox.
- [ ] Une erreur/refus de webcam n’empêche jamais l’accès à l’album.
- [ ] La connexion refuse un mauvais mot de passe et protège `admin.php`.
- [ ] L’aperçu puis l’ajout JPG/JPEG, PNG et WEBP fonctionnent sous 8 Mo.
- [ ] L’aperçu puis l’ajout MP4, WEBM, MOV ou M4V fonctionnent sous 40 Mo.
- [ ] Une vidéo s’ouvre avec ses contrôles dans la lightbox et s’arrête à la fermeture.
- [ ] Un fichier renommé avec une fausse extension image est refusé.
- [ ] La confirmation de suppression retire la ligne et le fichier sans rechargement.
- [ ] Les compteurs total/webcam/upload sont actualisés.
- [ ] L’interface reste confortable à 360 px, sur tablette et sur ordinateur.

La webcam fonctionne sur `localhost`, considéré comme un contexte sécurisé par les navigateurs modernes. Vérifiez les essais d’autorisation/refus dans une fenêtre privée si le navigateur a mémorisé votre choix.

## Mise en production

Pour un hébergeur PHP/MySQL classique (OVH, o2switch, Infomaniak, etc.) :

1. Créez une base MySQL et un utilisateur dédié avec les seuls droits nécessaires sur cette base.
2. Importez `database/database.sql` en adaptant ou en retirant les lignes `CREATE DATABASE` et `USE` si l’hébergeur impose le nom de base.
3. Envoyez les fichiers par SFTP dans le répertoire web.
4. Renseignez les accès MySQL dans `config.php`, ou de préférence via `ANNIV_DB_HOST`, `ANNIV_DB_NAME`, `ANNIV_DB_USER` et `ANNIV_DB_PASS` si l’hébergeur gère des variables d’environnement.
5. Donnez au processus PHP le droit d’écriture sur `uploads/`, sans permission globale `777` si elle peut être évitée.
6. Changez le compte initial et son mot de passe, puis activez un certificat TLS.
7. Testez upload, suppression, erreurs et webcam sur téléphone et ordinateur.

Sur Internet, `getUserMedia()` exige un **contexte HTTPS sécurisé**. Sans HTTPS, l’album reste utilisable mais le navigateur refusera la caméra. Les fichiers `.htaccess` fournis désactivent l’indexation des répertoires et bloquent l’exécution de scripts dans `uploads/` sur Apache. Confirmez leur prise en charge auprès de l’hébergeur.

Vercel n’exécute pas cette architecture PHP/MySQL Apache telle quelle. Les choix simples sont un hébergement PHP/MySQL traditionnel, un backend PHP séparé appelé par un front statique, ou une migration complète vers une stack serverless compatible Vercel.

Pour une démonstration temporaire depuis le PC, utilisez **Cloudflare Tunnel** ou **ngrok** afin d’exposer `http://localhost` derrière une URL HTTPS. Ne partagez cette URL qu’après avoir changé le mot de passe admin et ne laissez pas le tunnel ouvert inutilement.

## Sécurité et limites

Les opérations d’administration utilisent session, cookie HttpOnly/SameSite, hash de mot de passe et jeton CSRF. Les entrées SQL passent par PDO et requêtes préparées. Les images sont limitées à 8 Mo, contrôlées par extension, MIME et contenu, et reçoivent un nom aléatoire. Les erreurs détaillées sont inscrites dans le journal PHP sans être exposées au visiteur.

Pour un site public à fort trafic, ajoutez en complément une limitation de débit côté serveur/proxy sur `upload.php`, car cet endpoint doit rester public pour permettre la capture consentie.
