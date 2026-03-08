import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité - Alerte Neige',
  description: 'Politique de confidentialité de l\'application Alerte Neige.',
};

export default function PolitiquePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 prose prose-gray prose-sm">
      <h1 className="text-2xl font-extrabold text-gray-900">Politique de confidentialit&eacute;</h1>
      <p className="text-gray-500 text-sm">Derni&egrave;re mise &agrave; jour : 8 mars 2026</p>

      <h2>1. Introduction</h2>
      <p>
        Alerte Neige (&laquo; nous &raquo;, &laquo; notre &raquo;) exploite l&apos;application mobile Alerte Neige
        et le site web alerteneige.app. Cette politique explique comment nous recueillons, utilisons et
        prot&eacute;geons vos donn&eacute;es.
      </p>

      <h2>2. Donn&eacute;es collect&eacute;es</h2>
      <h3>Donn&eacute;es de localisation</h3>
      <p>
        Si vous activez la g&eacute;olocalisation, votre position est utilis&eacute;e <strong>uniquement sur votre appareil</strong> pour
        identifier votre rue et afficher les op&eacute;rations de d&eacute;neigement &agrave; proximit&eacute;.
        Nous ne stockons ni ne transmettons votre position &agrave; des tiers.
      </p>

      <h3>Notifications push</h3>
      <p>
        Si vous activez les alertes, nous enregistrons un jeton de notification (token) li&eacute; &agrave; la ou aux
        rues que vous surveillez. Ce jeton ne contient aucune information personnelle identifiable.
      </p>

      <h3>Donn&eacute;es de navigation</h3>
      <p>
        Le site web peut utiliser Google Analytics pour mesurer le trafic de mani&egrave;re anonyme
        (pages visit&eacute;es, dur&eacute;e de session, type d&apos;appareil). Aucun cookie de suivi publicitaire n&apos;est utilis&eacute;.
      </p>

      <h2>3. Donn&eacute;es que nous ne collectons pas</h2>
      <ul>
        <li>Aucun compte utilisateur n&apos;est requis</li>
        <li>Aucune adresse courriel, nom ou num&eacute;ro de t&eacute;l&eacute;phone</li>
        <li>Aucun historique de d&eacute;placement</li>
        <li>Aucune donn&eacute;e vendue ou partag&eacute;e &agrave; des annonceurs</li>
      </ul>

      <h2>4. Sources de donn&eacute;es</h2>
      <p>
        Les informations de d&eacute;neigement proviennent de sources publiques ouvertes :
        Ville de Montr&eacute;al, Longueuil, Laval, Qu&eacute;bec et Gatineau, ainsi qu&apos;OpenStreetMap
        pour les noms de rues. Ces donn&eacute;es sont fournies &agrave; titre informatif &mdash;
        la signalisation sur rue prime toujours.
      </p>

      <h2>5. Stockage et s&eacute;curit&eacute;</h2>
      <p>
        Notre serveur est h&eacute;berg&eacute; sur Microsoft Azure (Canada Central). Les communications
        sont chiffr&eacute;es via HTTPS. Nous ne stockons aucune donn&eacute;e personnelle sur nos serveurs.
      </p>

      <h2>6. Services tiers</h2>
      <ul>
        <li><strong>Microsoft Azure</strong> &mdash; H&eacute;bergement (Canada)</li>
        <li><strong>Google Analytics</strong> &mdash; Statistiques de trafic anonymes (peut &ecirc;tre d&eacute;sactiv&eacute;)</li>
        <li><strong>Apple Push / Firebase Cloud Messaging</strong> &mdash; Envoi des alertes push</li>
      </ul>

      <h2>7. Vos droits</h2>
      <p>
        Conform&eacute;ment &agrave; la Loi 25 du Qu&eacute;bec sur la protection des renseignements personnels, vous avez le droit de :
      </p>
      <ul>
        <li>Demander l&apos;acc&egrave;s aux donn&eacute;es vous concernant</li>
        <li>Demander la suppression de vos donn&eacute;es</li>
        <li>Retirer votre consentement aux notifications en tout temps</li>
      </ul>
      <p>
        Comme nous ne collectons pas de donn&eacute;es personnelles identifiables, ces droits s&apos;appliquent
        principalement au jeton de notification push, que vous pouvez r&eacute;voquer en d&eacute;sactivant
        les notifications dans les r&eacute;glages de votre appareil.
      </p>

      <h2>8. Modifications</h2>
      <p>
        Cette politique peut &ecirc;tre mise &agrave; jour. Les changements importants seront indiqu&eacute;s
        par la date de mise &agrave; jour en haut de cette page.
      </p>

      <h2>9. Contact</h2>
      <p>
        Pour toute question concernant cette politique :<br />
        <a href="mailto:info@alerteneige.app" className="text-brand-primary hover:underline">info@alerteneige.app</a>
      </p>
    </article>
  );
}
