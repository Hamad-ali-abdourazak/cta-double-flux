# Application de Supervision GTB - CTA Double Flux

## 📋 Description
Application web de supervision pour la Gestion Technique du Bâtiment (GTB), développée dans le cadre d'un stage chez GESTION ENERGIE SYSTEMES. Cette application permet la visualisation et le contrôle en temps réel d'équipements techniques de bâtiment.

## ✨ Fonctionnalités principales

### 🏠 Modules de supervision
- **CTA (Centrale de Traitement d'Air)** : Contrôle des moteurs, vannes, programmation horaire
- **Distribution Chaud** : Gestion des circuits de chauffage, consignes, pompes
- **Éclairages** : Contrôle par zones, programmation horaire, gestion des lux
- **Compteurs** : Suivi des consommations (eau, électricité, gaz), export CSV
- **Météo** : Données météorologiques contextuelles
- **Alarmes** : Gestion et acquittement des alarmes système
- **Événements** : Historique des actions et événements

### 👥 Gestion des utilisateurs
- Authentification sécurisée (login/password)
- Gestion des rôles : Administrateur, Opérateur, Invité
- Interface CRUD pour la gestion des comptes

### 🎨 Interface utilisateur
- Design responsive (PC, tablette, mobile)
- Navigation par sidebar intuitive
- Graphiques dynamiques avec Chart.js
- Interface moderne avec Bootstrap 5

## 🛠️ Technologies utilisées
- **Frontend** : HTML5, CSS3, JavaScript (ES6)
- **Framework CSS** : Bootstrap 5
- **Graphiques** : Chart.js
- **Stockage** : localStorage (persistance côté client)

## 🚀 Installation et utilisation

1. **Cloner le projet**
   ```bash
   git clone https://github.com/Hamad-ali-abdourazak/cta-double-flux.git
   cd cta-double-flux
   ```

2. **Lancer l'application**
   - Ouvrir `login.html` dans un navigateur web
   - Ou utiliser un serveur local (ex: Live Server avec VS Code)

3. **Connexion par défaut**
   - **Administrateur** : admin / admin123
   - **Opérateur** : operateur / oper123
   - **Invité** : invite / invite123

## 📁 Structure du projet
```
cta-double-flux/
├── index.html                     # Interface principale
├── login.html                     # Page de connexion
├── app.js                         # Logique applicative
├── style.css                      # Styles personnalisés
├── image_distribution_chaud.png   # Schéma du circuit de chauffage
└── fonctionnalites_par_onglet.txt # Documentation des fonctionnalités
```

## 🎯 Objectifs du projet
Ce prototype démontre la faisabilité d'une solution de supervision GTB entièrement client-side, avec :
- Simulation temps réel des équipements
- Interface intuitive pour les techniciens
- Gestion sécurisée des accès
- Base solide pour évolution vers architecture client-serveur

## 🔮 Évolutions futures
- Migration vers architecture client-serveur
- Intégration protocoles industriels (Modbus, BACnet)
- Connexion à de véritables équipements
- Base de données centralisée
- Notifications temps réel

## 👨‍💻 Auteur
**Hamad Ali Abdourazak**  
Master Informatique - Université Lumière Lyon 2  
Stage chez GESTION ENERGIE SYSTEMES (Juillet-Août 2025)

## 📄 Licence
Ce projet a été développé dans un cadre pédagogique et professionnel.