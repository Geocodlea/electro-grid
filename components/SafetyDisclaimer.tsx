import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SafetyDisclaimerProps {
  compact?: boolean;
}

export const SafetyDisclaimer: React.FC<SafetyDisclaimerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>Atenție siguranță:</strong> Verde indică doar absența sesizărilor active în registru. Nu certifică starea tehnică sau dreptul de manevră.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-xl p-3.5 shadow-sm text-xs md:text-sm leading-relaxed mb-4 flex items-start gap-3">
      <div className="p-1 bg-amber-100 rounded-md text-amber-800 flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <p className="font-bold text-amber-950 mb-0.5">
          AVERTISMENT DE SECURITATE ȘI UTILIZARE
        </p>
        <p className="text-amber-900">
          ElectroGrid MT este un instrument exclusiv de consultare și localizare. Nu comandă echipamente, nu stabilește manevre și nu înlocuiește schemele operative sau dispozițiile de manevră.
          Culoarea <strong>VERDE</strong> înseamnă doar că nu există sesizări active în sistem — <strong>nu certifică faptul că echipamentul este apt de manevră</strong>.
        </p>
      </div>
    </div>
  );
};
