# Testimona

## Termes de référence pour le recrutement d’une firme pour la conception et la création d’une application web dédiée à la commémoration de défunts

[**Qu’est-ce que Testimona?**](#qu’est-ce-que-testimona?)	**[2](#qu’est-ce-que-testimona?)**

[**Vision**](#vision)	**[2](#vision)**

[**Mission**](#mission)	**[2](#mission)**

[**Objectifs du présent projet**](#objectifs-du-présent-projet)	**[2](#objectifs-du-présent-projet)**

[**Apparence et contenu de l’application web**](#apparence-et-contenu-de-l’application-web)	**[3](#apparence-et-contenu-de-l’application-web)**

[Home Page](#home-page)	[3](#home-page)

[Signed in Home Page](#signed-in-home-page)	[4](#signed-in-home-page)

[Formulaire “Write a Testimonial”](#formulaire-“write-a-testimonial”)	[4](#formulaire-“write-a-testimonial”)

[Page “Sign in”](#page-“sign-in”)	[5](#page-“sign-in”)

[Page RIP](#page-rip)	[6](#page-rip)

[Tab-1 : Testimonials](#tab-1-:-testimonials)	[7](#tab-1-:-testimonials)

[Tab-2 : Photo](#tab-2-:-photo)	[8](#tab-2-:-photo)

[Tab-3 : Make a Donation](#tab-3-:-make-a-donation)	[8](#tab-3-:-make-a-donation)

[Tab-4 : Life details](#tab-4-:-life-details)	[9](#tab-4-:-life-details)

[Tab-5 : Funeral arrangements](#tab-5-:-funeral-arrangements)	[9](#tab-5-:-funeral-arrangements)

[Page “My Profile”](#page-“my-profile”)	[9](#page-“my-profile”)

[Page “Notifications”](#page-“notifications”)	[9](#page-“notifications”)

[Page “My Testimonials”](#page-“my-testimonials”)	[10](#page-“my-testimonials”)

[**Diagramme de séquence**](#heading=h.i636n63r9het)	**[10](#heading=h.i636n63r9het)**

# 

# Qu’est-ce que Testimona?  {#qu’est-ce-que-testimona?}

Testimona est une plateforme sociale publique dédiée à la mémoire de défunts sur laquelle les utilisateurs pourront écrire leurs témoignages, publier des photos et vidéos, et faire des dons aux ayants-droits[^1].

# Vision {#vision}

Notre vision est de célébrer la vie des êtres chers disparus en créant un espace de partage de souvenirs joyeux qui resteront gravés pour les proches et générations futures.

# Mission {#mission}

Devenir la plateforme sociale de référence pour la commémoration de la vie des défunts sur laquelle les proches publieront leurs témoignages et anecdotes qui seront partagés, commentés et conservés pour les générations futures.

# Objectifs du présent projet {#objectifs-du-présent-projet}

Le présent projet a pour objectif la conception et la création d’une application web (“site”) pour le projet Testimona afin de recueillir les témoignages et dons pour les familles endeuillées. Le site devra être en deux langues (français/anglais) et permettre les fonctionnalités suivantes:

1. Créer automatiquement une page web unique dédiée à chaque défunt (“RIP page”) à partir des témoignages publiés par les utilisateurs;  
2. Gérer les modifications apportées au contenu de la page RIP par un ou plusieurs membres de la famille du défunt, tel que Wikipedia;  
3. Gérer la publication sur la page RIP des messages, photos et vidéos par les utilisateurs;  
4. Partager la page RIP sur différents réseaux sociaux, Facebook, Instagram, Twitter, LinkedIn et WhatsApp;  
5. Recueillir et administrer les dons monétaires effectués par les utilisateurs.  
6. Administrer des espaces publicitaires (futur);  
7. Aider à retrouver les familles de personnes décédées anonymement (futur);  
8. Développer les arbres généalogiques des familles (futur);  
9. Afficher des défunts qui se ressemblent \- reconnaissance faciale (futur);  
10. Acquérir et analyser des données démographiques (futur).

Nous avons créé un premier “draft” du site sur WordPress qui devra être largement amélioré et développé pour inclure les fonctionnalités attendues : [https://testimona.com/](https://testimona.com/)

# Apparence et contenu de l’application web {#apparence-et-contenu-de-l’application-web}

## Home Page {#home-page}

![][image1]  
Tel que présenté ci-dessus, la page d’accueil (Home Page) devra être très épurée et ne comporter qu’un seul bouton “write a testimonial” qui redirigera l’utilisateur vers le formulaire de témoignage. La page d’accueil inclura également une section d’information (About us) qui présentera le projet Testimona (*le texte à inclure sera communiqué ultérieurement*)

**L’entête de page** inclura:

* un lien vers la page d’accueil (home);  
* un lien vers la section d’information (About Us);  
* un lien pour Log in/Sign in ou Disconnect (if logged in);  
* Un menu pour la langue;  
* une barre de recherche qui permettra de rechercher une page défunt à l’aide du nom du défunt (et accessoirement sa date de décès);

**Le pied de page** inclura :

* Des boutons pour le partage sur les réseaux sociaux (Facebook, Instagram, Twitter, LinkedIn, WhatsApp, etc.);  
* un lien vers les termes et conditions, sécurité, privacy.

## Signed in Home Page {#signed-in-home-page}

Lorsque l’utilisateur est logged in, plusieurs autres fonctionnalités apparaîtront sur la Home Page dont :

* Un menu vers les pages RIP existantes pour lesquelles l’utilisateur est administrateur;  
* Un lien vers la page My profile qui permettra à l’utilisateur de gérer son compte Testimona;  
* Un lien vers la page Notification qui présentera toutes les alertes destinées à l’utilisateur;  
* Un lien vers la page My Testimonials qui présente tous les témoignages publiés par l’utilisateur sur les différentes pages RIP.

## Formulaire “*Write a Testimonial”* {#formulaire-“write-a-testimonial”}

Le formulaire de témoignage va recueillir les éléments essentiels pour: 

* Créer une nouvelle page défunt, ou  
* Associer le témoignage à une page défunt existante

**Les informations à recueillir** sont:

* Nom et prénom de la personne décédée  
* Le pays dans lequel la personne est décédée  
* Le mois et l’année de décès   
* Le témoignage   
* Un ou plusieurs photos/vidéos  
* Le lien avec la personne décédée (enfant, époux, conjoint de faits, parent, oncle/tante, neveu, cousin, ami, collègue[^2])

**Recherche de pages RIP existantes :** lorsque l’utilisateur va entrer le nom/prénom du défunt, le formulaire suggérera les noms similaires dans un menu déroulant, incluant le pays, la date de décès et éventuellement une photo des défunts qui auront été éventuellement enregistrés par d’autres utilisateurs.Si le nom n’existe pas dans la base de données du site, l’utilisateur devra alors renseigner le pays, le mois et l’année de décès. Le site utilisera le nom/prénom, les photos, le pays et date de décès (aaaa/mm) pour éviter les doublons[^3]. Dans le cas où le nom et la page RIP n’existe pas encore, le site va créer automatiquement une page RIP dédiée à la personne décédée à partir des informations recueillies sur le formulaire.

**Le lien de parenté :** si l’utilisateur sélectionne “enfant, parent, conjoint de fait ou époux”, l’utilisateur sera identifié comme **close relative** et aura les droits (administrateur) pour éditer le contenu de la page RIP et également gérer les témoignages publiés par les utilisateurs.*\*\*Quelques informations devront être fournies pour confirmer le lien de parenté avec le défunt (acte de naissance, certificat de mariage, etc.)\*\** Il pourra également inviter et autoriser les autres close relatives afin qu’ils aient également les droits de modifier le contenu de la page RIP. Si l’utilisateur n’est pas un close relative, seul le témoignage de l’utilisateur sera publié sur la page RIP.

**Lorsque l’utilisateur soumet son témoignage**, il sera invité à se connecter à son compte Testimona ou créer un compte. Dès que l’utilisateur est connecté à son compte, son témoignage sera publié sur la page RIP et ce dernier pourra alors éditer son témoignage et recevoir des notifications à chaque fois que:

* Un autre utilisateur like son témoignage;  
* Un autre utilisateur partage son témoignage;  
* Un autre utilisateur commente son témoignage;  
* Un autre utilisateur publie un témoignage sur la même page RIP.

## Page “Sign in” {#page-“sign-in”}

S’il n’est pas déjà connecté, l’utilisateur sera donc invité à se connecter à son compte Testimona ou créer un compte. La création d’un compte devra être très simple, l’utilisateur pourra créer une compte à l’aide d’un compte existant Google, Facebook, Twitter ou Apple (ou autre), ou bien en recueillant le minimum d'information, soit:

* Nom d’utilisateur  
* Adresse email  
* Mot de passe  
* Photo profil (facultatif).

Dans le cas où l’utilisateur crée son compte sur Testimona sans utiliser ses comptes existants Google, Facebook ou autre, le site devra valider l’adresse web de l’utilisateur en envoyant un message à l’email indiqué. L’utilisateur aura donc un délai pour valider son adresse email en cliquant un lien sécurisé.

## Page RIP {#page-rip}

La page RIP sera divisée en trois sections.

1/ La première section de la page RIP abritera du contenu qui sera modifiable par les *close relatives* (administrateur), soit:

* Une biographie du défunt rédigé par les close relatives  
* Une photo profil du défunt[^4]

2/ La deuxième section inclura les onglets suivant (*tabs*) à l’image des onglets *Twitter* ci-contre : 

1. Testimonials  
2. Photos  
3. Make a donation  
4. Life details  
5. Funeral arrangements

3/ La troisième section comportera des boutons pour le partage de la page RIP sur les réseaux sociaux Facebook, Twitter et LinkedIn.

### **Tab-1 : Testimonials** {#tab-1-:-testimonials}

À l’image de la capture d’écran ci-contre de Twitter, l’onglet Testimonials inclura deux sous-sections :

1. La première sous-section permettra à un utilisateur d’écrire et publier un témoignage, incluant photo et/ou vidéo le cas échéant[^5]  
2. La deuxième sous-section affichera tous les témoignages publiés sur la page RIP du défunt.  Ils seront organisés en ordre chronologique et en nombre de like, le cas échéant.  
     
   *Note : Il y aura des boutons “like, partager ou commenter” en dessous de chaque témoignage.*   
     
 


### 

### **Tab-2 : Photo** {#tab-2-:-photo}

Cet onglet inclura également deux sous-sections

1. La première sous-section permettra à un utilisateur de télécharger une photo ou une vidéo à l’aide d’un bouton “share photo”[^6] ou la méthode *drag and drop.*  
2. La deuxième sous-section affichera uniquement les photos et vidéos qui auront été publiées sur la page du défunt. Un utilisateur pourra liker, commenter les photos/vidéos ou partager le témoignage sur les réseaux sociaux Facebook, Twitter ou LinkedIn.  
     
   *Note : Lorsque l’utilisateur clique publié, il sera invité à créer un compte (s’il n’est pas déjà connecté);*

### **Tab-3 : Make a Donation** {#tab-3-:-make-a-donation}

Cet onglet inclura deux sous-sections :

1. La première sous-section permettra de faire un don aux proches du défunt en quelques clics via PayPal ou autre plateforme (à discuter). Il faudra inclure un choix : 5$, 10$, 20$, 50$, 100$ ou Autre. Les *close-relatives* pourront également modifier le message de remerciement pour les dons et afficher l’objectif de dons sous la forme d’un graphique en barre.  
2. La deuxième sous-section affichera la liste des dons effectués par d’autres utilisateurs. Les utilisateurs auront le choix d’afficher ou non leur nom dans la liste des dons.

### 

### **Tab-4 : Life details**  {#tab-4-:-life-details}

Cet onglet sera modifiable seulement par les *close relatives* et présentera les informations personnels sur le défunt, notamment :

* Date et lieu de naissance  
* Date et lieu de décès  
* Nom des parents  
* Noms des enfants  
* Nom(s) des époux(ses)  
* Année et lieu de mariage  
* Ville(s)/Pays habité(s) et période  
* Métier, travaille  
* Etc.

Toutes ces informations pourront contenir des hyperliens.

### **Tab-5 : Funeral arrangements** {#tab-5-:-funeral-arrangements}

Cet onglet sera modifiable seulement par les *close relatives* et présentera les informations sur l’organisation des funérailles.

## Page “My Profile” {#page-“my-profile”}

La page My Profile va permettre à l’utilisateur d'accéder et modifier ses informations (nom, photo, etc.), suivre la collecte de dons et réclamer le paiement des dons.[^7]

## Page “Notifications” {#page-“notifications”}

La page Notification va permettre à l’utilisateur d’accéder à toutes les notifications, notamment aux évènements suivant:

* Nouveaux témoignages publiés sur la page RIP  
* Nouveaux *Like* sur un témoignage  
* Partage d’un témoignage  
* Signalement (Report) d’un témoignage inapproprié  
* Modification des informations sur la page RIP par un autre administrateur  
* Demande d’approbation d’un nouveau close relative

## Page “My Testimonials” {#page-“my-testimonials”}

La page My Testimonials affichera l’historique de tous les témoignages publiés par l’utilisateur. En cliquant sur un de ses témoignages, l’utilisateur sera redirigé vers la page RIP où le témoignage est publié.  


[^1]: Par ayants-droits, nous entendons les parents, les époux et/ou les enfants des défunts. Le projet Testimona va prendre la responsabilité d’identifier les ayants-droits, valider les liens avec le défunt et remettre les dons recueillis à la succession.

[^2]:  La liste sera à discuter pour voir la nomenclature la plus approprié

[^3]:  Dans le cas où deux personnes portant le même nom sont décédées le même mois, année et pays, ET n’ont pas de photo pour les différencier, le site demandera alors de valider l’âge de la personne au moment du décès.

[^4]:  En cliquant sur la photo du défunt, toutes les photos et les vidéos qui auront été publiées sur la page RIP défileront telle une story Instagram. Les vidéos seront écourtées à 15 secondes.

[^5]:  Les close relatives reçoivent une notification à chaque fois qu’un témoignage est publié sur la page RIP du défunt. Ils peuvent effacer ou masquer le témoignage s’ils jugent que le contenu n’est pas approprié. Dans une version plus avancée du site, nous développerons un algorithme pour détecter les messages inappropriés.

[^6]:  Plus tard, la fonction Share Photo pourra se connecter au compte Google Photo ou Drive de l’utilisateur

[^7]:  Plusieurs autres paramètres vont être ajoutés et développés au fur et à mesure, notamment en ce qui concerne les niveaux de confidentialité, sécurité, données financières pour le paiement de dons, etc.
