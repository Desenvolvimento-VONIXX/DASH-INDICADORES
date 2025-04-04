import { useEffect, useState } from "react";
import "./App.css";
import { ArrowLeft } from "lucide-react";
import { Input } from "./components/ui/input";
import { maskCurrency, unmaskCurrency } from "./lib/masks";

interface Setor {
  ID: number;
  IDGRUPO: number;
  SETOR: string;
}

interface Indicador {
  ID_INDICAD: number;
  ID_SUBGRUPO: number;
  SUBGRUPO: string;
  INDICADOR: string;
  MES: string;
  META: number;
  UNIDADE: string;
  RESULTADO: number;
  DESVIO?: number;
  METAOULIMITE?: string;
  PESO: number;
  INDICADORAUT: string;
  HABILITADO: string;
}

interface IndicadoresOrganizados {
  [key: string]: {
    ID_INDICAD: number;
    ID_SUBGRUPO: number;
    SUBGRUPO: string;
    INDICADOR: string;
    METAOULIMITE: { [key: string]: string };
    META: { [key: string]: number };
    UNIDADE: string;
    RESULTADO: { [key: string]: number };
    PESO: number;
    DESVIO: { [key: string]: number };
    INDICADORAUT: string;
    HABILITADO: string;
  };
}
const mesesNomes: { [key: string]: string } = {
  "1": "JANEIRO",
  "2": "FEVEREIRO",
  "3": "MARÇO",
  "4": "ABRIL",
  "5": "MAIO",
  "6": "JUNHO",
  "7": "JULHO",
  "8": "AGOSTO",
  "9": "SETEMBRO",
  "10": "OUTUBRO",
  "11": "NOVEMBRO",
  "12": "DEZEMBRO",
};

function App() {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [idSetor, setIdSetor] = useState<number | null>(null);
  const [nomeSetor, setNomeSetor] = useState<string>("");
  const [listaIndicadores, setListaIndicadores] = useState<boolean>(false);
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [trimestre, setTrimestre] = useState<number>(1);
  const [anoSelecionado, setAnoSelecionado] = useState(
    new Date().getFullYear()
  );
  const [resultados, setResultados] = useState<{ [key: string]: string }>({});
  const [desvios, setDesvios] = useState<{ [key: string]: number }>({});
  const [nomeUsu, setNomeUsu] = useState("");
  const [codUsu, setCodUsu] = useState();
  const [inputValores, setInputValores] = useState<Record<string, string>>({});
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  console.log(indicadores);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    indicador: any,
    mes: string
  ) => {
    const valor = unmaskCurrency(e.target.value);

    const chave = `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${mes}`;

    setResultados((prevState) => ({
      ...prevState,
      [chave]: valor,
    }));

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      handleBlurInputChange(
        indicador.ID_SUBGRUPO,
        indicador.ID_INDICAD,
        mes,
        valor.replace(",", ".")
      );
    }, 1000);

    setTypingTimeout(timeout);
  };

  const handleBlurInputChange = async (
    idSubGrupo: number,
    idIndicador: number,
    mes: string,
    valor: string
  ) => {
    const chave = `${idSubGrupo}-${idIndicador}-${mes}`;
    const valorAnterior = resultados[chave];

    if (valorAnterior == valor) {
      return;
    }

    // Consulta do mês
    const idMeses = await consultaChaveMes(idSubGrupo, idIndicador, mes);

    // Consultar o log atual no banco
    const resultadoConsulta = await JX.consultar(
      `SELECT LOG FROM AD_INDICAD WHERE ID = ${idSetor} AND ID_SUBGRUPO = ${idSubGrupo} AND ID_INDICADOR = ${idIndicador} AND ID_MESES = ${idMeses}`
    );
    const logAtual = resultadoConsulta[0]?.LOG || "";

    // Formatar data
    const dataAlteracao = new Date();
    const dataFormatada = dataAlteracao.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Criar o novo log
    const novoLog = `{(${codUsu} - ${nomeUsu} - ${dataFormatada}) resultado = ${valor}};`;
    const logFormatado = logAtual.trim() ? `${logAtual}\n${novoLog}` : novoLog;

    // Salvar no banco de dados
    const novoValor = valor.replace(",", ".");
    if (idMeses && idSetor && idSubGrupo && idIndicador && mes) {
      await JX.salvar(
        { RESULTADO: novoValor, LOG: logFormatado },
        "AD_INDICAD",
        [
          {
            ID: idSetor,
            ID_SUBGRUPO: idSubGrupo,
            ID_INDICAD: idIndicador,
            ID_MESES: idMeses,
          },
        ]
      );
    }
  };

  useEffect(() => {
    setInputValores(resultados);
  }, [resultados]);

  useEffect(() => {
    JX.consultar(
      `SELECT USU.CODUSU, USU.NOMEUSU FROM TSIUSU USU WHERE USU.CODUSU = SANKHYA.STP_GET_CODUSULOGADO()`
    ).then((data: any) => {
      setNomeUsu(data[0].NOMEUSU);
      setCodUsu(data[0].CODUSU);
    });
  }, []);

  // busca o ID_MESES para fazer o update
  const consultaChaveMes = async (
    idSubGrupo: number,
    idIndicador: number,
    mes: string
  ) => {
    try {
      const data = await JX.consultar(`
        SELECT ID_MESES 
        FROM AD_INDICAD IND
        WHERE 
        ID = ${idSetor}
        AND ID_SUBGRUPO = ${idSubGrupo}
        AND ID_INDICAD = ${idIndicador}
        AND EXISTS (
          SELECT 1 FROM AD_INDICADMESES
          WHERE ID_MESES = IND.ID_MESES AND ID = ${idSetor} AND MES = ${mes} AND ANO = ${anoSelecionado} 
        )
      `);
      if (data && data.length > 0) {
        return data[0].ID_MESES;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Erro na consulta de ID_MESES:", error);
      return null;
    }
  };

  // calcula o devio
  useEffect(() => {
    const novosDesvios: { [key: string]: number } = {};

    Object.values(indicadoresOrganizados).forEach((indicador: any) => {
      Object.keys(indicador.RESULTADO).forEach((mes) => {
        const chave = `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${mes}`;

        // Recuperar o resultado atual (valor do input ou valor do indicador)
        const resultadoAtual =
          inputValores[chave] !== undefined && inputValores[chave] !== ""
            ? parseFloat(inputValores[chave].replace(",", ".")) || 0
            : Number(indicador.RESULTADO[mes]) || 0;

        const meta = Number(indicador.META?.[mes]) || 0;
        let metaOuLimite = "META";

        if (
          indicador.METAOULIMITE &&
          typeof indicador.METAOULIMITE === "object"
        ) {
          metaOuLimite = indicador.METAOULIMITE[mes] ?? "META";
        } else if (typeof indicador.METAOULIMITE === "string") {
          metaOuLimite = indicador.METAOULIMITE;
        }

        metaOuLimite = String(metaOuLimite).trim().toUpperCase();

        // Calcular o desvio
        let desvio = resultadoAtual - meta;

        if (metaOuLimite === "LIMITE") {
          desvio = desvio * -1;
          if (Object.is(desvio, -0)) desvio = 0;
        }

        // Atualizar o desvio
        novosDesvios[chave] = desvio;
      });
    });

    setDesvios(novosDesvios);
  }, [inputValores, resultados, indicadores]);

  function pesquisarHabilitado(id: Number, idSubgrupo: Number, mes: string) {
    const resultado = indicadores.find(
      (item) =>
        item.ID_INDICAD === id &&
        item.ID_SUBGRUPO === idSubgrupo &&
        item.MES === mes
    );

    // Verifica se o resultado existe e retorna o valor de HABILITADO
    return resultado ? resultado.HABILITADO : null; // Retorna 'null' caso não encontre
  }

  // organiza indicadores onde traz o valor e o mês referente
  const indicadoresOrganizados: IndicadoresOrganizados = indicadores.reduce(
    (acc, indicador) => {
      const chave = `${indicador.SUBGRUPO}-${indicador.INDICADOR}`;
      const formatarPeso = (peso: number) => Number(peso.toFixed(2));

      if (!acc[chave]) {
        acc[chave] = {
          ID_INDICAD: indicador.ID_INDICAD,
          ID_SUBGRUPO: indicador.ID_SUBGRUPO,
          INDICADORAUT: indicador.INDICADORAUT,
          HABILITADO: indicador.HABILITADO,
          SUBGRUPO: indicador.SUBGRUPO,
          INDICADOR: indicador.INDICADOR,
          METAOULIMITE: {},
          META: {},
          UNIDADE: indicador.UNIDADE,
          PESO: Number(indicador.PESO),
          RESULTADO: {},
          DESVIO: {},
        };
      }
      acc[chave].METAOULIMITE[indicador.MES] = String(
        indicador.METAOULIMITE ?? "META"
      );
      acc[chave].META[indicador.MES] = indicador.META;
      acc[chave].RESULTADO[indicador.MES] = indicador.RESULTADO;
      acc[chave].DESVIO[indicador.MES] = indicador.RESULTADO - indicador.META;
      acc[chave].PESO = formatarPeso(indicador.PESO);

      return acc;
    },
    {} as IndicadoresOrganizados
  );

  //busca setores
  useEffect(() => {
    JX.consultar(
      `
      SELECT INDSETOR.ID, GRU.IDGRUPO, GRU.SETOR FROM AD_INDICADSETOR INDSETOR
      INNER JOIN AD_GRUPOSINDICAD GRU ON GRU.IDGRUPO = INDSETOR.IDGRUPO
      INNER JOIN AD_INDICADUSUARIOS ON AD_INDICADUSUARIOS.ID = INDSETOR.ID
      WHERE SANKHYA.STP_GET_CODUSULOGADO() = AD_INDICADUSUARIOS.CODUSU
    `
    ).then((data: any) => setSetores(data));
  }, []);

  //busca indicadores do setor
  useEffect(() => {
    if (idSetor !== null) {
      const consulta = `
        SELECT IND.ID, 
        IND.ID_SUBGRUPO,
        IND.INDICADORAUT,
        CASE 
        WHEN IND.HABILITADO IS NOT NULL THEN IND.HABILITADO 
        WHEN sankhya.Get_proximo_dia_util( 
            DATEADD(DAY, 5, EOMONTH(DATEFROMPARTS(YEAR(GETDATE()), IND.ID_MESES, 1))), 
            0, 0, 0 
        ) >= CAST(GETDATE() AS DATE) 
        THEN 'S' 
        ELSE 'N' 
        END AS HABILITADO,
          (SELECT TOP 1 GRU.Setor FROM AD_GRUPOSINDICAD GRU
           INNER JOIN AD_INDICADSUBGRUPO SUB ON SUB.IDGRUPO = GRU.IDGRUPO
           WHERE SUB.ID_SUBGRUPO = IND.ID_SUBGRUPO AND SUB.ID = ${idSetor}) AS SUBGRUPO,
          IND.ID_INDICAD, 
          INDP.INDICADOR, 
          INDP.UNIDADE, 
          CAST(IND.PESO AS DECIMAL(10,2)) AS PESO,
          IND.META,
          IND.METAOULIMITE,
          REPLACE(TRIM(STR(IND.RESULTADO, 20, 2)), '.', ',') AS RESULTADO,
          IND.ID_MESES,
          (SELECT TOP 1 MES FROM AD_INDICADMESES INDMES WHERE INDMES.ID_MESES = IND.ID_MESES) AS MES
        FROM AD_INDICAD IND
        INNER JOIN AD_INDICADPRINCIPAL INDP ON IND.ID_INDICADOR = INDP.ID_INDICADOR
        WHERE IND.ID = ${idSetor}
        AND EXISTS (
          SELECT 1 FROM AD_INDICADMESES
          WHERE ID_MESES = IND.ID_MESES AND ID = ${idSetor} AND ANO = ${anoSelecionado}
        )
          order by IND.ID_SUBGRUPO, IND.ID_INDICADOR
      `;
      JX.consultar(consulta).then((data: any) => setIndicadores(data));
    }
  }, [idSetor, anoSelecionado]);

  //busca os meses de cada trimestre
  const mesesDoTrimestre = Object.keys(mesesNomes).filter(
    (mes) => Math.ceil(parseInt(mes) / 3) === trimestre
  );
  //filtrar meses do trimestre
  const indicadoresFiltrados = Object.values(indicadoresOrganizados).filter(
    (indicador) =>
      mesesDoTrimestre.some((mes) => indicador.RESULTADO[mes] !== undefined)
  );

  useEffect(() => {
    const novosResultados: { [key: string]: string } = {};

    indicadores.forEach((indicador) => {
      const chave = `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${indicador.MES}`;
      novosResultados[chave] = String(indicador.RESULTADO ?? "");
    });

    setResultados(novosResultados);
  }, [indicadores]);

  return (
    <>
      {listaIndicadores && idSetor ? (
        <>
          <div className="relative w-full p-5 flex items-center">
            <span
              onClick={() => {
                setListaIndicadores(false);
                setIdSetor(null);
              }}
              className="absolute left-5 p-2 cursor-pointer"
            >
              <ArrowLeft className="w-8 h-8 dark:text-white" />
            </span>

            <h2 className="text-3xl dark:text-white font-bold flex-1 text-center">
              {nomeSetor}
            </h2>

            <Input
              type="text"
              placeholder="Ano"
              className="dark:text-white bg-transparent border dark:border-white px-3 py-1 rounded-md w-20 ml-auto"
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(Number(e.target.value))}
            />
          </div>

          <div className="p-10">
            <div className="text-sm font-medium text-center border-b dark:text-slate-400 border-slate-700 ">
              <ul className="flex flex-wrap -mb-px">
                {[1, 2, 3, 4].map((num) => (
                  <li key={num} className="me-2">
                    <button
                      onClick={() => setTrimestre(num)}
                      className={`inline-block p-4 bg-transparent border-b-2 rounded-t-lg ${
                        trimestre === num
                          ? "text-blue-500 border-blue-500 font-bold"
                          : "border-transparent hover:border-slate-600 hover:text-slate-600"
                      }`}
                    >
                      Trimestre {num}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {indicadoresFiltrados.length > 0 ? (
              <table className="min-w-full text-sm text-left dark:text-white mt-3">
                <thead>
                  <tr className="dark:text-slate-200 uppercase">
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2"></th>
                    {mesesDoTrimestre.map((mes) => (
                      <th
                        key={mes}
                        className="px-4 py-2 border border-slate-500 text-center"
                      >
                        {mesesNomes[mes]}
                      </th>
                    ))}
                    <th className="px-4 py-2 border border-slate-500 text-center">
                      MÉDIA DO TRIMESTRE
                    </th>
                    <th className="px-4 py-2 border border-slate-500 text-center">
                      PESO
                    </th>
                    <th className="px-4 py-2 border border-slate-500 text-center">
                      PESO FIXO
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {indicadoresFiltrados.flatMap((indicador, index, array) => {
                    const isFirstOfSubgrupo =
                      index === 0 ||
                      array[index - 1].SUBGRUPO !== indicador.SUBGRUPO;
                    const isLastOfSubgrupo =
                      index === array.length - 1 ||
                      array[index + 1].SUBGRUPO !== indicador.SUBGRUPO;
                    const subgrupoCount = array.filter(
                      (i) => i.SUBGRUPO === indicador.SUBGRUPO
                    ).length;

                    const valoresMeta = mesesDoTrimestre
                      .map((mes) => indicador.META[mes] ?? null)
                      .filter(
                        (v) =>
                          v !== null &&
                          (typeof v !== "string" || v !== "") &&
                          typeof v === "number" &&
                          !isNaN(v)
                      );

                    const valoresResultado = mesesDoTrimestre
                      .map(
                        (mes) =>
                          resultados[
                            `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${mes}`
                          ] ??
                          indicador.RESULTADO[mes] ??
                          null
                      )
                      .filter(
                        (v) => v !== null && v !== "" && !isNaN(parseFloat(v))
                      );

                    const mediaMeta = valoresMeta.length
                      ? valoresMeta.reduce(
                          (acc, val) =>
                            acc +
                            (typeof val === "number" ? val : parseFloat(val)),
                          0
                        ) / valoresMeta.length
                      : 0;

                    const mediaResultado = valoresResultado.length
                      ? valoresResultado.reduce(
                          (acc, val) =>
                            acc +
                            (typeof val === "string"
                              ? parseFloat(val.replace(",", "."))
                              : val),
                          0
                        ) / valoresResultado.length
                      : 0;

                    const metaOuLimite =
                      typeof indicador.METAOULIMITE === "object"
                        ? indicador.METAOULIMITE[mesesDoTrimestre[0]] ?? "META"
                        : indicador.METAOULIMITE;

                    const resultado = Number(mediaResultado) || 0;
                    const meta = Number(mediaMeta) || 0;

                    const pesoFinal =
                      metaOuLimite === "LIMITE"
                        ? resultado <= meta
                          ? indicador.PESO
                          : 0
                        : resultado < meta
                        ? 0
                        : indicador.PESO;

                    return [
                      ...["Meta", "Resultado", "Desvio"].map(
                        (tipo, tipoIndex) => {
                          const valoresValidos = mesesDoTrimestre
                            .map((mes) => {
                              if (tipo === "Meta")
                                return indicador.META[mes] ?? null;
                              if (tipo === "Resultado")
                                return (
                                  resultados[
                                    `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${mes}`
                                  ] ??
                                  indicador.RESULTADO[mes] ??
                                  null
                                );
                              if (tipo === "Desvio")
                                return (
                                  desvios[
                                    `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${mes}`
                                  ] ?? null
                                );

                              return null;
                            })
                            .filter((v) => v !== null && v !== "");

                          const mediaTrimestre = valoresValidos.length
                            ? new Intl.NumberFormat("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }).format(
                                valoresValidos.reduce((acc: any, val: any) => {
                                  const valorNumerico =
                                    typeof val === "string"
                                      ? parseFloat(val.replace(",", "."))
                                      : val;
                                  return acc + valorNumerico;
                                }, 0) /
                                  valoresValidos.filter(
                                    (val) => val !== null || val !== undefined
                                  ).length
                              )
                            : "";

                          return (
                            <tr key={`${index}-${tipoIndex}`}>
                              {tipoIndex === 0 && isFirstOfSubgrupo && (
                                <td
                                  className="uppercase px-4 py-2 border text-white bg-slate-500 border-slate-500 text-center font-semibold"
                                  rowSpan={subgrupoCount * 3}
                                >
                                  {indicador.SUBGRUPO}
                                </td>
                              )}
                              {tipoIndex === 0 && (
                                <td
                                  className="uppercase px-4 py-2 border bg-slate-300 border-slate-500 text-center font-medium"
                                  rowSpan={3}
                                >
                                  {indicador.INDICADOR}
                                </td>
                              )}
                              {tipoIndex === 0 && (
                                <td
                                  className="uppercase px-4 py-2 border bg-slate-200 border-slate-500 text-center font-medium"
                                  rowSpan={3}
                                >
                                  {indicador.UNIDADE}
                                </td>
                              )}
                              <td className="uppercase px-4 py-2 border bg-slate-100 border-slate-500 text-center font-semibold">
                                {tipo}
                              </td>

                              {mesesDoTrimestre.map((mes) => (
                                <td
                                  key={`${mes}-${tipo}-${index}`}
                                  className={`px-4 py-2 border border-slate-500 text-center ${
                                    tipo === "Desvio" &&
                                    desvios[
                                      `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${mes}`
                                    ] != null
                                      ? desvios[
                                          `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${mes}`
                                        ] < 0
                                        ? "bg-rose-500 font-bold"
                                        : "bg-emerald-500 font-bold"
                                      : ""
                                  }`}
                                >
                                  {tipo === "Meta" &&
                                  indicador.META[mes] != null ? (
                                    new Intl.NumberFormat("pt-BR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }).format(indicador.META[mes])
                                  ) : tipo === "Resultado" ? (
                                    <input
                                      type="text"
                                      className="w-full text-center border-none outline-none bg-transparent"
                                      value={
                                        resultados[
                                          `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${mes}`
                                        ]
                                          ? maskCurrency(
                                              resultados[
                                                `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${mes}`
                                              ]
                                            )
                                          : ""
                                      }
                                      disabled={
                                        indicador.INDICADORAUT === "S" ||
                                        pesquisarHabilitado(
                                          indicador.ID_INDICAD,
                                          indicador.ID_SUBGRUPO,
                                          mes
                                        ) != "S"
                                      }
                                      onChange={(e) =>
                                        handleChange(e, indicador, mes)
                                      }
                                    />
                                  ) : tipo === "Desvio" &&
                                    desvios[
                                      `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${mes}`
                                    ] != null ? (
                                    new Intl.NumberFormat("pt-BR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }).format(
                                      desvios[
                                        `${indicador.ID_SUBGRUPO}-${indicador.ID_INDICAD}-${mes}`
                                      ]
                                    ) ?? ""
                                  ) : (
                                    ""
                                  )}
                                </td>
                              ))}

                              {/* Média do Trimestre */}
                              <td className="uppercase px-4 py-2 border border-slate-500 text-center font-bold">
                                {mediaTrimestre}
                              </td>

                              {tipoIndex === 0 && (
                                <>
                                  <td
                                    className="uppercase px-4 py-2 border border-slate-500 text-center font-medium"
                                    rowSpan={3}
                                  >
                                    {pesoFinal}
                                  </td>
                                  <td
                                    className="uppercase px-4 py-2 border border-slate-500 text-center font-medium"
                                    rowSpan={3}
                                  >
                                    {indicador.PESO}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        }
                      ),
                      isLastOfSubgrupo && (
                        <tr
                          key={`aderencia-${indicador.SUBGRUPO}-${index}`}
                          className="bg-slate-900"
                        >
                          <td
                            colSpan={mesesDoTrimestre.length + 5}
                            className="uppercase px-4 py-1 border bg-yellow-200 dark:bg-slate-300 border-slate-500 text-slate-900 font-semibold"
                          >
                            ADERÊNCIA DO SETOR
                          </td>
                          <td className="uppercase text-center border bg-yellow-200 dark:bg-slate-300 border-slate-500 text-slate-900 font-semibold">
                            {array
                              .filter((i) => i.SUBGRUPO === indicador.SUBGRUPO)
                              .reduce((acc, i) => {
                                console.log(
                                  "Processando indicador:",
                                  i.INDICADOR
                                );

                                const valoresMeta = mesesDoTrimestre
                                  .map((mes) => Number(i.META[mes]))
                                  .filter((v) => !isNaN(v));

                                console.log(
                                  "Valores filtrados da Meta:",
                                  valoresMeta
                                );

                                const mediaMeta = valoresMeta.length
                                  ? valoresMeta.reduce(
                                      (acc, val) => acc + val,
                                      0
                                    ) / valoresMeta.length
                                  : 0;

                                console.log("Média da Meta:", mediaMeta);

                                const valoresResultado = mesesDoTrimestre
                                  .map((mes) => {
                                    let valorStr =
                                      resultados[
                                        `${i.ID_SUBGRUPO}-${i.ID_INDICAD}-${mes}`
                                      ] ?? i.RESULTADO[mes];

                                    if (valorStr == null || valorStr === "")
                                      return null; // Evita erro

                                    const valor = Number(
                                      valorStr.toString().replace(",", ".")
                                    );
                                    console.log(
                                      `Mês: ${mes}, Valor original: ${valorStr}, Valor convertido: ${valor}`
                                    );

                                    return isNaN(valor) ? null : valor; // Garante que só entra valores válidos
                                  })
                                  .filter((v) => v !== null);

                                console.log(
                                  "Valores filtrados do Resultado:",
                                  valoresResultado
                                );

                                const mediaResultado = valoresResultado.length
                                  ? valoresResultado.reduce(
                                      (acc, val) => acc + val,
                                      0
                                    ) / valoresResultado.length
                                  : 0;

                                console.log(
                                  "Média do Resultado:",
                                  mediaResultado
                                );

                                const metaOuLimite =
                                  typeof i.METAOULIMITE === "object"
                                    ? i.METAOULIMITE[mesesDoTrimestre[0]] ??
                                      "META"
                                    : i.METAOULIMITE;

                                console.log("Meta ou Limite:", metaOuLimite);

                                const resultado = Number(mediaResultado) || 0;
                                const meta = Number(mediaMeta) || 0;

                                const pesoFinal =
                                  metaOuLimite === "LIMITE"
                                    ? resultado <= meta
                                      ? i.PESO
                                      : 0
                                    : resultado < meta
                                    ? 0
                                    : i.PESO;

                                console.log("Peso Final:", pesoFinal);

                                return acc + pesoFinal * 100;
                              }, 0)
                              .toFixed(2)}
                            %
                          </td>
                          <td className="uppercase text-center border bg-yellow-200 dark:bg-slate-300 border-slate-500 text-slate-900 font-semibold">
                            100%
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-400 text-center mt-5">
                Nenhum indicador disponível para este trimestre.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <h1 className="text-5xl dark:text-white font-bold mb-8 tracking-wide">
            INDICADORES TRACT
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 px-6">
            {setores.map((setor) => (
              <div
                key={setor.ID}
                onClick={() => {
                  setIdSetor(setor.ID);
                  setNomeSetor(setor.SETOR);
                  setListaIndicadores(true);
                  setIndicadores([]);
                }}
                className="bg-gradient-to-br cursor-pointer dark:text-white p-6 rounded-xl shadow-lg border border-slate-600 transition-transform transform hover:scale-105 hover:shadow-2xl"
              >
                <h2 className="text-xl font-semibold text-center">
                  {setor.SETOR}
                </h2>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
