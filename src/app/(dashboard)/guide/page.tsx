"use client";

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guide d'utilisation</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Guide débutant + FAQ pour comprendre FinanceFlow et bien démarrer.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Démarrage rapide</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          1) Importe tes transactions ou connecte tes comptes. 2) Vérifie les catégories dans
          Transactions. 3) Lance la détection d'abonnements. 4) Consulte Marchands pour analyser
          tes dépenses.
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Concepts clés</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>Catégorie</strong> : classe une dépense ou un revenu.{" "}
          <strong>Règle marchand</strong> : alias, image, notes, exclusion d'abonnement et
          catégories associées. <strong>Abonnement</strong> : paiement régulier détecté
          automatiquement.
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">FAQ</h2>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            <strong>Pourquoi une catégorie change toute seule ?</strong> Une règle de catégorisation
            (manuelle ou automatique) a été appliquée.
          </p>
          <p>
            <strong>Pourquoi un marchand n'apparaît pas en abonnement ?</strong> Il peut être dans la
            banlist, ou la récurrence n'est pas encore assez forte.
          </p>
          <p>
            <strong>Comment aller plus vite dans l'app ?</strong> Utilise <strong>Ctrl + K</strong>{" "}
            pour ouvrir la recherche rapide globale.
          </p>
        </div>
      </section>
    </div>
  );
}
