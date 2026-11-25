from types import SimpleNamespace


class ConsultaGravada:
    def __init__(self, banco, alvo):
        self.banco, self.alvo, self.operacoes = banco, alvo, []

    def __getattr__(self, metodo):
        def registrar(*args, **kwargs):
            self.operacoes.append((metodo, args))
            return self

        return registrar

    def execute(self):
        self.banco.executadas.append((self.alvo, self.operacoes))
        resposta = self.banco.respostas.pop(0)
        if isinstance(resposta, Exception):
            raise resposta
        return SimpleNamespace(data=resposta.get("data", []), count=resposta.get("count"))


class BancoFalso:
    def __init__(self, *respostas):
        self.respostas = list(respostas)
        self.executadas: list[tuple[str, list]] = []

    def table(self, nome):
        return ConsultaGravada(self, nome)

    def rpc(self, funcao, parametros):
        consulta = ConsultaGravada(self, f"rpc:{funcao}")
        consulta.operacoes.append(("rpc", (parametros,)))
        return consulta

    def gravado(self, operacao: str) -> list:
        return [
            args[0]
            for _, operacoes in self.executadas
            for metodo, args in operacoes
            if metodo == operacao
        ]

    def filtros(self, alvo: str) -> list[tuple]:
        return [
            args
            for nome, operacoes in self.executadas
            if nome == alvo
            for metodo, args in operacoes
            if metodo == "eq"
        ]
