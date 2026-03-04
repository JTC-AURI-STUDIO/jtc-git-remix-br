export interface CEPData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface Estado {
  id: number;
  sigla: string;
  nome: string;
}

export interface Cidade {
  id: number;
  nome: string;
}

export const fetchCEP = async (cep: string): Promise<CEPData | null> => {
  try {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return null;

    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();

    if (data.erro) return null;
    return data;
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return null;
  }
};

export const fetchEstados = async (): Promise<Estado[]> => {
  try {
    const response = await fetch(
      "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome"
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar estados:", error);
    return [];
  }
};

export const fetchCidades = async (uf: string): Promise<Cidade[]> => {
  try {
    const response = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar cidades:", error);
    return [];
  }
};
