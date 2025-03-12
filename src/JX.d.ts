declare class JX {
    static async salvar(
      dados: Record<string, unknown>,
      instancia: string,
      chavesPrimarias?: Record<string, unknown>[]
    ): Promise;
  
    static async post(
      url: string,
      corpo: Record<string, unknown> | null | FormData,
      opcoes: {
        headers?: Record<string, string>;
        raw?: boolean;
      } = {
        headers: {},
        raw: false,
      }
    );
  
    static async novoSalvar(
      dados: Record<string, string | number>,
      instancia: string,
      chavesPrimarias?: Record<string, string | number>
    );
  
    static async deletar(
      instancia: string,
      chavesPrimarias: Record<string, string | number>[]
    );
  
    static async consultar(query: string);
  }
  