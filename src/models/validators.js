const nonNegativeNumber = {
  validator: (value) => Number.isFinite(value) && value >= 0,
  message: 'La valeur doit être un nombre fini positif ou nul.',
};

const positiveNumber = {
  validator: (value) => Number.isFinite(value) && value > 0,
  message: 'La valeur doit être un nombre fini strictement positif.',
};

const uniqueMaterials = {
  validator: (lines) => {
    const ids = lines.map((line) => String(line.rawMaterial));
    return lines.length > 0 && new Set(ids).size === ids.length;
  },
  message: 'La composition doit contenir au moins une matière, sans doublon.',
};

export { nonNegativeNumber, positiveNumber, uniqueMaterials };
