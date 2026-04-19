export default function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div className={`text-[11px] leading-relaxed opacity-50 ${className}`}>
      <p>
        <strong className="font-semibold">makroturkiye</strong> bağımsız bir projedir; Türkiye Cumhuriyet
        Merkez Bankası (TCMB) ile resmi bir bağlantısı yoktur. Veriler{" "}
        <a
          href="https://evds3.tcmb.gov.tr"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:opacity-100"
        >
          TCMB EVDS
        </a>
        'den alınır ve cache'lenir; gecikme olabilir. Güncel/resmi değerler için EVDS esastır.
      </p>
      <p className="mt-1.5">
        Gösterilen hiçbir içerik yatırım tavsiyesi değildir. Verilerin doğruluğu, güncelliği ve
        eksiksizliğinden TCMB ve bu proje sorumlu tutulamaz.
      </p>
    </div>
  );
}
