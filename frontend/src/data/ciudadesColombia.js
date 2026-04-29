// Ciudades de Colombia con departamento
// Formato: { label: "CIUDAD, DEPARTAMENTO" }
const CIUDADES = [
  // AMAZONAS
  { label: "LETICIA, AMAZONAS" },
  // ANTIOQUIA
  { label: "MEDELLÍN, ANTIOQUIA" },
  { label: "BELLO, ANTIOQUIA" },
  { label: "ENVIGADO, ANTIOQUIA" },
  { label: "ITAGÜÍ, ANTIOQUIA" },
  { label: "APARTADÓ, ANTIOQUIA" },
  { label: "TURBO, ANTIOQUIA" },
  { label: "RIONEGRO, ANTIOQUIA" },
  { label: "CAUCASIA, ANTIOQUIA" },
  { label: "SABANETA, ANTIOQUIA" },
  { label: "CALDAS, ANTIOQUIA" },
  { label: "LA ESTRELLA, ANTIOQUIA" },
  { label: "COPACABANA, ANTIOQUIA" },
  { label: "GIRARDOTA, ANTIOQUIA" },
  // ARAUCA
  { label: "ARAUCA, ARAUCA" },
  { label: "SARAVENA, ARAUCA" },
  // ATLÁNTICO
  { label: "BARRANQUILLA, ATLÁNTICO" },
  { label: "SOLEDAD, ATLÁNTICO" },
  { label: "MALAMBO, ATLÁNTICO" },
  { label: "SABANALARGA, ATLÁNTICO" },
  { label: "BARANOA, ATLÁNTICO" },
  { label: "GALAPA, ATLÁNTICO" },
  // BOGOTÁ D.C.
  { label: "BOGOTÁ, BOGOTÁ D.C." },
  // BOLÍVAR
  { label: "CARTAGENA, BOLÍVAR" },
  { label: "MAGANGUÉ, BOLÍVAR" },
  { label: "TURBACO, BOLÍVAR" },
  { label: "EL CARMEN DE BOLÍVAR, BOLÍVAR" },
  // BOYACÁ
  { label: "TUNJA, BOYACÁ" },
  { label: "DUITAMA, BOYACÁ" },
  { label: "SOGAMOSO, BOYACÁ" },
  { label: "CHIQUINQUIRÁ, BOYACÁ" },
  { label: "PAIPA, BOYACÁ" },
  { label: "VILLA DE LEYVA, BOYACÁ" },
  // CALDAS
  { label: "MANIZALES, CALDAS" },
  { label: "VILLAMARÍA, CALDAS" },
  { label: "LA DORADA, CALDAS" },
  { label: "CHINCHINÁ, CALDAS" },
  // CAQUETÁ
  { label: "FLORENCIA, CAQUETÁ" },
  // CASANARE
  { label: "YOPAL, CASANARE" },
  { label: "AGUAZUL, CASANARE" },
  // CAUCA
  { label: "POPAYÁN, CAUCA" },
  { label: "SANTANDER DE QUILICHAO, CAUCA" },
  { label: "PUERTO TEJADA, CAUCA" },
  // CESAR
  { label: "VALLEDUPAR, CESAR" },
  { label: "AGUACHICA, CESAR" },
  { label: "BOSCONIA, CESAR" },
  // CHOCÓ
  { label: "QUIBDÓ, CHOCÓ" },
  { label: "ISTMINA, CHOCÓ" },
  // CÓRDOBA
  { label: "MONTERÍA, CÓRDOBA" },
  { label: "LORICA, CÓRDOBA" },
  { label: "SAHAGÚN, CÓRDOBA" },
  { label: "CERETÉ, CÓRDOBA" },
  { label: "MONTELÍBANO, CÓRDOBA" },
  // CUNDINAMARCA
  { label: "SOACHA, CUNDINAMARCA" },
  { label: "FUSAGASUGÁ, CUNDINAMARCA" },
  { label: "FACATATIVÁ, CUNDINAMARCA" },
  { label: "ZIPAQUIRÁ, CUNDINAMARCA" },
  { label: "GIRARDOT, CUNDINAMARCA" },
  { label: "CHÍA, CUNDINAMARCA" },
  { label: "CAJICÁ, CUNDINAMARCA" },
  { label: "MADRID, CUNDINAMARCA" },
  { label: "MOSQUERA, CUNDINAMARCA" },
  { label: "FUNZA, CUNDINAMARCA" },
  { label: "TOCANCIPÁ, CUNDINAMARCA" },
  { label: "SOPÓ, CUNDINAMARCA" },
  { label: "VILLETA, CUNDINAMARCA" },
  { label: "LA MESA, CUNDINAMARCA" },
  { label: "SIBATÉ, CUNDINAMARCA" },
  // GUAINÍA
  { label: "INÍRIDA, GUAINÍA" },
  // GUAVIARE
  { label: "SAN JOSÉ DEL GUAVIARE, GUAVIARE" },
  // HUILA
  { label: "NEIVA, HUILA" },
  { label: "PITALITO, HUILA" },
  { label: "GARZÓN, HUILA" },
  { label: "LA PLATA, HUILA" },
  // LA GUAJIRA
  { label: "RIOHACHA, LA GUAJIRA" },
  { label: "MAICAO, LA GUAJIRA" },
  { label: "URIBIA, LA GUAJIRA" },
  // MAGDALENA
  { label: "SANTA MARTA, MAGDALENA" },
  { label: "CIÉNAGA, MAGDALENA" },
  { label: "FUNDACIÓN, MAGDALENA" },
  { label: "ARACATACA, MAGDALENA" },
  // META
  { label: "VILLAVICENCIO, META" },
  { label: "ACACÍAS, META" },
  { label: "GRANADA, META" },
  { label: "SAN MARTÍN, META" },
  // NARIÑO
  { label: "PASTO, NARIÑO" },
  { label: "TUMACO, NARIÑO" },
  { label: "IPIALES, NARIÑO" },
  { label: "TÚQUERRES, NARIÑO" },
  // NORTE DE SANTANDER
  { label: "CÚCUTA, NORTE DE SANTANDER" },
  { label: "OCAÑA, NORTE DE SANTANDER" },
  { label: "PAMPLONA, NORTE DE SANTANDER" },
  { label: "VILLA DEL ROSARIO, NORTE DE SANTANDER" },
  { label: "LOS PATIOS, NORTE DE SANTANDER" },
  // PUTUMAYO
  { label: "MOCOA, PUTUMAYO" },
  { label: "PUERTO ASÍS, PUTUMAYO" },
  // QUINDÍO
  { label: "ARMENIA, QUINDÍO" },
  { label: "CALARCÁ, QUINDÍO" },
  { label: "MONTENEGRO, QUINDÍO" },
  // RISARALDA
  { label: "PEREIRA, RISARALDA" },
  { label: "DOSQUEBRADAS, RISARALDA" },
  { label: "SANTA ROSA DE CABAL, RISARALDA" },
  { label: "LA VIRGINIA, RISARALDA" },
  // SAN ANDRÉS Y PROVIDENCIA
  { label: "SAN ANDRÉS, SAN ANDRÉS Y PROVIDENCIA" },
  // SANTANDER
  { label: "BUCARAMANGA, SANTANDER" },
  { label: "FLORIDABLANCA, SANTANDER" },
  { label: "GIRÓN, SANTANDER" },
  { label: "PIEDECUESTA, SANTANDER" },
  { label: "BARRANCABERMEJA, SANTANDER" },
  { label: "SAN GIL, SANTANDER" },
  { label: "SOCORRO, SANTANDER" },
  { label: "VÉLEZ, SANTANDER" },
  // SUCRE
  { label: "SINCELEJO, SUCRE" },
  { label: "COROZAL, SUCRE" },
  { label: "SAMPUÉS, SUCRE" },
  // TOLIMA
  { label: "IBAGUÉ, TOLIMA" },
  { label: "ESPINAL, TOLIMA" },
  { label: "HONDA, TOLIMA" },
  { label: "MELGAR, TOLIMA" },
  { label: "CHAPARRAL, TOLIMA" },
  { label: "LÍBANO, TOLIMA" },
  // VALLE DEL CAUCA
  { label: "CALI, VALLE DEL CAUCA" },
  { label: "BUENAVENTURA, VALLE DEL CAUCA" },
  { label: "PALMIRA, VALLE DEL CAUCA" },
  { label: "TULUÁ, VALLE DEL CAUCA" },
  { label: "BUGA, VALLE DEL CAUCA" },
  { label: "CARTAGO, VALLE DEL CAUCA" },
  { label: "YUMBO, VALLE DEL CAUCA" },
  { label: "JAMUNDÍ, VALLE DEL CAUCA" },
  { label: "CANDELARIA, VALLE DEL CAUCA" },
  { label: "EL CERRITO, VALLE DEL CAUCA" },
  { label: "FLORIDA, VALLE DEL CAUCA" },
  { label: "ROLDANILLO, VALLE DEL CAUCA" },
  // VAUPÉS
  { label: "MITÚ, VAUPÉS" },
  // VICHADA
  { label: "PUERTO CARREÑO, VICHADA" },
]

export default CIUDADES
