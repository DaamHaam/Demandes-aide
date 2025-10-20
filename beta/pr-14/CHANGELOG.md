# Changelog

Ce document suit les changements notables du projet. Le format est inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et respecte la numérotation sémantique.

## [0.10] - 2025-10-10
### Modifié
- Suppression de l'option « Rajouter s'il vous plaît » et retrait automatique de cette demande pour les données existantes.
- Mise à jour de la version affichée et du cache statique du service worker pour la publication 0.10.

## [0.08] - 2025-10-08
### Modifié
- Raccourcissement du bandeau supérieur avec l'affichage discret de la version et des boutons réduits alignés à l'horizontale.
- Remplacement des libellés par des icônes sur les commandes « Mode édition » et « Nouvelle demande » pour limiter la place occupée.
- Conservation d'un bouton « Favoris » textuel pour rappeler le tri tout en réduisant la largeur nécessaire.

## [0.07] - 2025-10-07
### Modifié
- Barre d'actions compacte en haut de l'écran avec des boutons plus courts et un défilement horizontal pour éviter les empilements.
- Réduction des marges du bandeau supérieur afin de libérer de l'espace utile pour les cartes.

## [0.06] - 2025-10-06
### Modifié
- Réorganisation des commandes principales en haut de l'écran avec un bouton « Mode édition » et le raccourci « Nouvelle demande ».
- Masquage des actions étoile et crayon hors mode édition tout en conservant un indicateur étoilé pour les favoris.
- Agrandissement des icônes d'édition et de favoris pour faciliter la sélection tactile et mise à jour du cache statique.

## [0.05] - 2025-10-05
### Ajouté
- Intégration des enregistrements audio fournis pour toutes les demandes par défaut, avec une nouvelle carte « Un mouchoir ».

### Modifié
- Mise à jour du service worker pour mettre en cache les fichiers audio locaux et diffusion de la version v0.05 de l'application.

## [0.04] - 2025-10-04
### Modifié
- Retrait définitif du badge « MP3 indisponible » en supprimant la classe appliquée côté JavaScript et en forçant un nouveau cache statique.
- Espacement vertical réduit entre les cartes et leurs indicateurs pour limiter la zone grise visible.
- Incrémentation de la version affichée à v0.04 et renommage du cache statique du service worker.

## [0.03] - 2025-10-04
### Modifié
- Retrait du badge "MP3 indisponible" sur les cartes pour éviter qu'il ne masque les actions disponibles.
- Réduction des espacements verticaux entre les cartes et ajustement de l'indicateur MP3 pour une liste plus compacte.
- Incrémentation du numéro de version affiché et du cache statique du service worker pour la publication 0.03.

## [0.02] - 2024-06-20
### Ajouté
- Création du journal des modifications pour suivre l'évolution du projet.

### Modifié
- Mise à jour du numéro de version affiché dans l'interface pour refléter la nouvelle itération.
- Récapitulation des ajouts récents : stabilisation du workflow GitHub Pages et refonte de l'interface de gestion des phrases et de la synthèse vocale.

## [0.01] - 2024-05-01
### Ajouté
- Première version rendue publique avec la gestion des demandes, des favoris et la génération de fichiers audio ElevenLabs stockés en cache.
