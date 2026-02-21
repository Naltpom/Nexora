"""seed legal pages with template content

Revision ID: f7a8b9c0d1e2
Revises: 3612ed346443
Create Date: 2026-02-21 19:00:00.000000

"""
from typing import Sequence, Union
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, None] = '3612ed346443'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

now = datetime.now(timezone.utc).isoformat()

PAGES = [
    {
        "slug": "privacy-policy",
        "title": "Politique de confidentialite",
        "is_published": True,
        "version": 1,
        "content_html": """
<h2>1. Introduction</h2>
<p>[Nom de l'entreprise] (ci-apres « nous ») s'engage a proteger la vie privee de ses utilisateurs.
Cette politique decrit comment nous collectons, utilisons et protegeons vos donnees personnelles
conformement au Reglement General sur la Protection des Donnees (RGPD).</p>

<h2>2. Responsable du traitement</h2>
<p><strong>Raison sociale :</strong> [Nom de l'entreprise]<br/>
<strong>Adresse :</strong> [Adresse complete]<br/>
<strong>Email :</strong> [email-contact@exemple.com]<br/>
<strong>DPO :</strong> [Nom du DPO ou « Non designe »]</p>

<h2>3. Donnees collectees</h2>
<p>Nous collectons les categories de donnees suivantes :</p>
<ul>
<li><strong>Donnees d'identification :</strong> nom, prenom, adresse email</li>
<li><strong>Donnees de connexion :</strong> adresse IP, identifiant de session, horodatage</li>
<li><strong>Donnees d'utilisation :</strong> pages visitees, actions effectuees, preferences</li>
<li>[Ajouter d'autres categories si necessaire]</li>
</ul>

<h2>4. Finalites du traitement</h2>
<p>Vos donnees sont traitees pour les finalites suivantes :</p>
<ul>
<li>Gestion de votre compte utilisateur et authentification</li>
<li>Fourniture et amelioration de nos services</li>
<li>Envoi de notifications liees a votre utilisation</li>
<li>Securite et prevention des fraudes</li>
<li>[Ajouter d'autres finalites]</li>
</ul>

<h2>5. Bases legales</h2>
<p>Nos traitements reposent sur les bases legales suivantes :</p>
<ul>
<li><strong>Consentement :</strong> cookies non essentiels, communications marketing</li>
<li><strong>Execution du contrat :</strong> gestion de votre compte, fourniture du service</li>
<li><strong>Interet legitime :</strong> securite, amelioration du service, statistiques internes</li>
<li><strong>Obligation legale :</strong> conservation des logs de connexion</li>
</ul>

<h2>6. Duree de conservation</h2>
<ul>
<li><strong>Donnees de compte :</strong> duree de l'inscription + [X] mois apres suppression</li>
<li><strong>Logs de connexion :</strong> [12] mois</li>
<li><strong>Cookies :</strong> [13] mois maximum</li>
<li><strong>Donnees de facturation :</strong> [10] ans (obligation legale)</li>
</ul>

<h2>7. Vos droits</h2>
<p>Conformement au RGPD, vous disposez des droits suivants :</p>
<ul>
<li><strong>Droit d'acces :</strong> obtenir une copie de vos donnees</li>
<li><strong>Droit de rectification :</strong> corriger vos donnees inexactes</li>
<li><strong>Droit a l'effacement :</strong> demander la suppression de vos donnees</li>
<li><strong>Droit a la portabilite :</strong> recevoir vos donnees dans un format structure</li>
<li><strong>Droit d'opposition :</strong> vous opposer a certains traitements</li>
<li><strong>Droit a la limitation :</strong> restreindre le traitement de vos donnees</li>
</ul>
<p>Pour exercer vos droits, rendez-vous dans la section
<a href="/rgpd/my-data">Mes donnees</a> ou contactez-nous a [email-dpo@exemple.com].</p>

<h2>8. Transferts de donnees</h2>
<p>[Indiquer si des donnees sont transferees hors UE et les garanties mises en place,
ou preciser : « Vos donnees sont hebergees au sein de l'Union europeenne. »]</p>

<h2>9. Securite</h2>
<p>Nous mettons en oeuvre des mesures techniques et organisationnelles appropriees :
chiffrement des donnees en transit (TLS), hachage des mots de passe, controle d'acces
par roles, journalisation des acces aux donnees personnelles.</p>

<h2>10. Contact et reclamation</h2>
<p>Pour toute question relative a cette politique, contactez-nous a [email-contact@exemple.com].</p>
<p>Si vous estimez que vos droits ne sont pas respectes, vous pouvez introduire une reclamation
aupres de la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertes) :
<a href="https://www.cnil.fr" target="_blank" rel="noopener">www.cnil.fr</a>.</p>
""".strip(),
    },
    {
        "slug": "terms",
        "title": "Conditions generales d'utilisation",
        "is_published": True,
        "version": 1,
        "content_html": """
<h2>1. Objet</h2>
<p>Les presentes Conditions Generales d'Utilisation (CGU) definissent les modalites d'acces
et d'utilisation de la plateforme [Nom de la plateforme] (ci-apres « le Service »)
editee par [Nom de l'entreprise].</p>

<h2>2. Acceptation</h2>
<p>L'utilisation du Service implique l'acceptation pleine et entiere des presentes CGU.
Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le Service.</p>

<h2>3. Acces au Service</h2>
<p>Le Service est accessible [gratuitement / sur abonnement] a tout utilisateur disposant
d'un acces Internet. L'inscription necessite la fourniture d'informations exactes et a jour.</p>
<p>[Nom de l'entreprise] se reserve le droit de suspendre ou de fermer l'acces au Service
pour maintenance, mise a jour ou toute autre raison, sans preavis.</p>

<h2>4. Compte utilisateur</h2>
<ul>
<li>Chaque utilisateur est responsable de la confidentialite de ses identifiants</li>
<li>Toute activite effectuee depuis un compte est presumee realisee par son titulaire</li>
<li>En cas de suspicion d'utilisation non autorisee, l'utilisateur doit nous contacter immediatement</li>
</ul>

<h2>5. Utilisation du Service</h2>
<p>L'utilisateur s'engage a :</p>
<ul>
<li>Utiliser le Service conformement a sa destination</li>
<li>Ne pas porter atteinte a la securite ou au fonctionnement du Service</li>
<li>Ne pas tenter d'acceder a des donnees qui ne lui sont pas destinees</li>
<li>Respecter les droits de propriete intellectuelle</li>
<li>[Ajouter d'autres obligations specifiques au projet]</li>
</ul>

<h2>6. Propriete intellectuelle</h2>
<p>L'ensemble des contenus, interfaces, code source et elements graphiques du Service
sont la propriete de [Nom de l'entreprise] et sont proteges par le droit de la propriete
intellectuelle. Toute reproduction non autorisee est interdite.</p>

<h2>7. Donnees personnelles</h2>
<p>Le traitement des donnees personnelles est regi par notre
<a href="/rgpd/legal/privacy-policy">Politique de confidentialite</a>.</p>

<h2>8. Responsabilite</h2>
<p>[Nom de l'entreprise] s'efforce d'assurer la disponibilite et le bon fonctionnement du Service,
mais ne saurait etre tenue responsable :</p>
<ul>
<li>Des interruptions temporaires du Service</li>
<li>Des dommages indirects lies a l'utilisation du Service</li>
<li>Des contenus publies par les utilisateurs</li>
</ul>

<h2>9. Modification des CGU</h2>
<p>[Nom de l'entreprise] se reserve le droit de modifier les presentes CGU a tout moment.
Les utilisateurs seront informes de toute modification substantielle.
La poursuite de l'utilisation du Service vaut acceptation des nouvelles conditions.</p>

<h2>10. Droit applicable</h2>
<p>Les presentes CGU sont regies par le droit francais. Tout litige sera soumis
a la competence des tribunaux de [Ville].</p>

<h2>11. Contact</h2>
<p>Pour toute question relative a ces CGU : [email-contact@exemple.com]</p>
""".strip(),
    },
    {
        "slug": "legal-notice",
        "title": "Mentions legales",
        "is_published": True,
        "version": 1,
        "content_html": """
<h2>Editeur du site</h2>
<p><strong>Raison sociale :</strong> [Nom de l'entreprise]<br/>
<strong>Forme juridique :</strong> [SAS / SARL / Auto-entrepreneur / ...]<br/>
<strong>Capital social :</strong> [Montant] euros<br/>
<strong>Siege social :</strong> [Adresse complete]<br/>
<strong>RCS :</strong> [Ville] [Numero]<br/>
<strong>SIRET :</strong> [Numero SIRET]<br/>
<strong>TVA intracommunautaire :</strong> [Numero TVA]<br/>
<strong>Directeur de la publication :</strong> [Prenom Nom]<br/>
<strong>Email :</strong> [email-contact@exemple.com]<br/>
<strong>Telephone :</strong> [+33 X XX XX XX XX]</p>

<h2>Hebergeur</h2>
<p><strong>Nom :</strong> [Nom de l'hebergeur]<br/>
<strong>Adresse :</strong> [Adresse de l'hebergeur]<br/>
<strong>Telephone :</strong> [Telephone de l'hebergeur]<br/>
<strong>Site web :</strong> [URL de l'hebergeur]</p>

<h2>Propriete intellectuelle</h2>
<p>L'ensemble du contenu de ce site (textes, images, graphismes, logo, icones, sons, logiciels)
est la propriete de [Nom de l'entreprise] ou de ses partenaires et est protege par les lois
francaises et internationales relatives a la propriete intellectuelle.</p>
<p>Toute reproduction, representation, modification, publication ou adaptation, totale ou partielle,
de ces elements est interdite sans autorisation ecrite prealable.</p>

<h2>Donnees personnelles</h2>
<p>Conformement au RGPD et a la loi Informatique et Libertes, vous disposez de droits
sur vos donnees personnelles. Consultez notre
<a href="/rgpd/legal/privacy-policy">Politique de confidentialite</a>
pour plus d'informations.</p>

<h2>Cookies</h2>
<p>Ce site utilise des cookies. Consultez notre
<a href="/rgpd/legal/cookie-policy">Politique de cookies</a>
pour en savoir plus sur leur utilisation et vos options de gestion.</p>

<h2>Credits</h2>
<p>[Mentionner les credits photos, icones, polices ou bibliotheques utilisees si necessaire]</p>
""".strip(),
    },
    {
        "slug": "cookie-policy",
        "title": "Politique de cookies",
        "is_published": True,
        "version": 1,
        "content_html": """
<h2>1. Qu'est-ce qu'un cookie ?</h2>
<p>Un cookie est un petit fichier texte depose sur votre appareil (ordinateur, tablette, smartphone)
lors de la visite d'un site web. Il permet au site de se souvenir de vos actions et preferences
pendant une duree determinee.</p>

<h2>2. Cookies que nous utilisons</h2>

<h3>Cookies strictement necessaires</h3>
<p>Ces cookies sont indispensables au fonctionnement du site. Ils ne peuvent pas etre desactives.</p>
<ul>
<li><strong>Session d'authentification :</strong> maintient votre connexion active</li>
<li><strong>Preferences de consentement :</strong> memorise vos choix en matiere de cookies</li>
<li><strong>Securite :</strong> protection CSRF et prevention des fraudes</li>
</ul>

<h3>Cookies fonctionnels</h3>
<p>Ces cookies ameliorent l'experience utilisateur sans etre indispensables.</p>
<ul>
<li><strong>Theme :</strong> memorise votre preference clair/sombre</li>
<li><strong>Langue :</strong> retient votre choix de langue</li>
<li><strong>Preferences d'affichage :</strong> taille de police, disposition, etc.</li>
</ul>

<h3>Cookies analytiques</h3>
<p>Ces cookies nous aident a comprendre comment les visiteurs utilisent le site.</p>
<ul>
<li><strong>[Google Analytics / Matomo / autre] :</strong> statistiques de frequentation anonymisees</li>
<li>Duree de conservation : [13] mois maximum</li>
</ul>

<h3>Cookies marketing</h3>
<p>[Si applicable : decrire les cookies marketing utilises.
Sinon : « Nous n'utilisons actuellement aucun cookie marketing. »]</p>

<h2>3. Gestion de vos preferences</h2>
<p>Vous pouvez a tout moment modifier vos preferences de cookies depuis la page
<a href="/rgpd/consent">Preferences de consentement</a>.</p>
<p>Vous pouvez egalement configurer votre navigateur pour bloquer ou supprimer les cookies.
Notez que la desactivation de certains cookies peut affecter le fonctionnement du site.</p>

<h2>4. Duree de conservation</h2>
<ul>
<li><strong>Cookies de session :</strong> supprimes a la fermeture du navigateur</li>
<li><strong>Cookies persistants :</strong> [13] mois maximum, conformement aux recommandations de la CNIL</li>
</ul>

<h2>5. Cookies tiers</h2>
<p>[Lister les services tiers qui deposent des cookies sur votre site, par exemple :
Google Analytics, Stripe, services de chat, etc. Ou indiquer : « Aucun cookie tiers n'est depose. »]</p>

<h2>6. En savoir plus</h2>
<p>Pour en savoir plus sur les cookies et vos droits :</p>
<ul>
<li><a href="https://www.cnil.fr/fr/cookies-et-autres-traceurs" target="_blank" rel="noopener">CNIL — Cookies et traceurs</a></li>
<li><a href="https://www.allaboutcookies.org/" target="_blank" rel="noopener">All About Cookies</a></li>
</ul>

<h2>7. Contact</h2>
<p>Pour toute question relative a notre utilisation des cookies : [email-contact@exemple.com]</p>
""".strip(),
    },
]


def upgrade() -> None:
    legal_pages = sa.table(
        "legal_pages",
        sa.column("slug", sa.String),
        sa.column("title", sa.String),
        sa.column("content_html", sa.Text),
        sa.column("is_published", sa.Boolean),
        sa.column("version", sa.Integer),
        sa.column("updated_by_id", sa.Integer),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )

    for page in PAGES:
        op.execute(
            legal_pages.insert().values(
                slug=page["slug"],
                title=page["title"],
                content_html=page["content_html"],
                is_published=page["is_published"],
                version=page["version"],
                updated_by_id=None,
                created_at=now,
                updated_at=now,
            )
        )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DELETE FROM legal_pages WHERE slug IN ('privacy-policy', 'terms', 'legal-notice', 'cookie-policy')"
        )
    )
