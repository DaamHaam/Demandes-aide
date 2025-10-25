# Changelog

Ce document suit les changements notables du projet. Le format est inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et respecte la numérotation sémantique.

## [0.19] - 2025-10-21
### Modifié
- Agrandissement des icônes des boutons d'en-tête et des actions d'édition pour qu'elles correspondent à la taille des boutons tactiles.
- Affichage du numéro de version v0.19 encore plus discret et repositionné pour libérer l'espace d'action en haut à droite.
- Ajout de `viewport-fit=cover` afin que le bandeau supérieur occupe toute la zone de sécurité sur iPhone et évite l'apparition des cartes sous la barre de statut.
- Invalidation du cache statique du service worker (`aac-static-v19`) pour diffuser les ressources de la version 0.19.

## [0.18] - 2025-10-20
### Modifié
- Agrandissement des boutons principaux en leur donnant une largeur identique à la hauteur pour conserver une forme circulaire sur smartphone.
- Suppression des champs liés au MP3 dans le formulaire puisque l'audio est géré directement depuis Supabase.
- Ajustement du bandeau supérieur (safe area iOS) et du cartouche de version pour éviter que les cartes n'apparaissent sous la zone système.
- Invalidation du cache statique du service worker (`aac-static-v18`) et mise à jour de l'interface en v0.18.

## [0.17] - 2025-10-19
### Modifié
- Retrait de l'étoile décorative affichée à gauche des cartes en mode édition puisqu'elle faisait doublon avec la bordure jaune et l'action étoile.
- Suppression du zoom persistant après fermeture du formulaire en donnant une taille lisible aux champs et en annulant le focus actif lors de la fermeture.
- Invalidation du cache statique du service worker (`aac-static-v17`) et mise à jour de l'interface en v0.17.

## [0.16] - 2025-10-18
### Modifié
- Affichage de la version v0.16 encore plus discret et rapproché du coin supérieur gauche pour libérer l'espace des commandes.
- Agrandissement des boutons principaux en largeur pour conserver une forme circulaire facile à viser.
- Suppression de la mise en surbrillance du texte des cartes lors d'un clic en rendant l'étiquette non sélectionnable.
- Mise à jour du cache statique du service worker (`aac-static-v16`) pour diffuser les fichiers de la version 0.16.

## [0.15] - 2025-10-17
### Modifié
- Mise à jour de l'interface pour afficher la version v0.15 dans l'en-tête.
- Invalidation du cache statique du service worker avec l'identifiant `aac-static-v15` pour rafraîchir les fichiers de la version 0.15.

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
