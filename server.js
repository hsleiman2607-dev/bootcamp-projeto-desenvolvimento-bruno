import 'dotenv/config';
import express from "express";
import cors from "cors";
import prisma from "./PrismaClient.js";

const app = express();
app.use(express.json());
app.use(cors());
// ==========================================
// 1. ROTAS DE CATEGORIAS
// ==========================================
app.post("/categorias", async (req, res) => {
    const { CatNome } = req.body; 
    if (!CatNome) return res.status(400).json({ error: "O campo CatNome é obrigatório" });
    try {
        const nova = await prisma.categoria.create({ data: { CatNome } });
        res.status(201).json(nova);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/categorias", async (req, res) => {
    const lista = await prisma.categoria.findMany();
    res.json(lista);
});

// ATUALIZAR CATEGORIA
app.put("/categorias/:id", async (req, res) => {
    const { CatNome } = req.body;
    try {
        const atualizada = await prisma.categoria.update({
            where: { CatID: parseInt(req.params.id) },
            data: { CatNome }
        });
        res.json(atualizada);
    } catch (e) {
        res.status(500).json({ error: "Erro ao atualizar categoria." });
    }
});

// DELETAR CATEGORIA
app.delete("/categorias/:id", async (req, res) => {
    try {
        await prisma.categoria.delete({
            where: { CatID: parseInt(req.params.id) }
        });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: "Erro ao deletar: verifique se há registros vinculados." });
    }
});

// ==========================================
// 2. ROTAS DE PESSOAS (Com Telefone e Descrição)
// ==========================================
app.post("/pessoas", async (req, res) => {
    const { nome_completo, email, telefone, descricao, CatID } = req.body;
    if (!nome_completo || !email || !CatID) {
        return res.status(400).json({ error: "Nome, Email e CatID são obrigatórios" });
    }
    try {
        const pessoa = await prisma.pessoa.create({
            data: { 
                nome_completo, 
                email, 
                telefone: telefone || null,
                descricao: descricao || null,
                CatID: parseInt(CatID) 
            }
        });
        res.status(201).json(pessoa);
    } catch (e) { res.status(500).json({ error: "E-mail duplicado ou erro no banco." }); }
});

app.get("/pessoas", async (req, res) => {
    const lista = await prisma.pessoa.findMany({ include: { categoria: true } });
    res.json(lista);
});


// ATUALIZAR PESSOA
app.put("/pessoas/:id", async (req, res) => {
    const { id } = req.params;
    const { nome_completo, email, telefone, descricao, CatID } = req.body;

    try {
        const pessoaAtualizada = await prisma.pessoa.update({
            where: { PesID: parseInt(id) }, // Prisma usa PesID como chave primária aqui
            data: {
                nome_completo: nome_completo || undefined,
                email: email || undefined,
                telefone: telefone || null,
                descricao: descricao || null,
                // Garante que o ID da categoria seja um número antes de salvar
                CatID: CatID ? parseInt(CatID) : undefined 
            }
        });
        res.json(pessoaAtualizada);
    } catch (e) {
        console.error("Erro ao atualizar:", e);
        res.status(500).json({ error: "Erro ao atualizar pessoa. Verifique se o e-mail já existe ou se o ID é válido." });
    }
});


// DELETAR PESSOA
app.delete("/pessoas/:id", async (req, res) => {
    const { id } = req.params;
    
    try {
        await prisma.pessoa.delete({
            where: { PesID: parseInt(id) } // Certifique-se que o campo no schema é PesID
        });
        res.status(204).send(); // Sucesso sem conteúdo
    } catch (e) {
        console.error("Erro ao deletar:", e);
        
        // Tratamento específico para erro de restrição (Pessoa vinculada a Oferta)
        if (e.code === 'P2003') {
            return res.status(400).json({ 
                error: "Não é possível excluir esta pessoa pois ela possui ofertas vinculadas." 
            });
        }
        
        res.status(500).json({ error: "Erro interno ao tentar deletar o registro." });
    }
});

// ==========================================
// 3. ROTAS DE OFERTAS (Com Filtro Extra e Join)
// ==========================================
app.post("/ofertas", async (req, res) => {
    const { titulo, descricao, nivel, categoria_ID, pessoa_ID } = req.body;
    if (!titulo || !categoria_ID || !pessoa_ID) {
        return res.status(400).json({ error: "Título, categoria_ID e pessoa_ID são obrigatórios" });
    }
    try {
        const novaOferta = await prisma.oferta.create({
            data: {
                titulo,
                descricao: descricao || null,
                nivel: nivel || null,
                categoria_ID: parseInt(categoria_ID),
                pessoa_ID: parseInt(pessoa_ID)
            }
        });
        res.status(201).json(novaOferta);
    } catch (e) { res.status(500).json({ error: "Erro ao criar oferta. Verifique IDs." }); }
});

// GET /ofertas - Suporta filtro opcional: /ofertas?categoria_ID=1
app.get("/ofertas", async (req, res) => {
    const { categoria_ID } = req.query;
    try {
        const ofertas = await prisma.oferta.findMany({
            where: categoria_ID ? { categoria_ID: parseInt(categoria_ID) } : {},
            include: { categoria: true, pessoa: true }
        });
        res.json(ofertas);
    } catch (e) { res.status(500).json({ error: "Erro ao buscar ofertas" }); }
});

app.delete("/ofertas/:id", async (req, res) => {
    try {
        await prisma.oferta.delete({ where: { id: parseInt(req.params.id) } });
        res.status(204).send();
    } catch (e) { res.status(500).json({ error: "Erro ao deletar" }); }
});

app.put("/ofertas/:id", async (req, res) => {
    const { titulo, descricao, nivel, categoria_ID, pessoa_ID } = req.body;
    try {
        const ofertaAtualizada = await prisma.oferta.update({
            where: { id: parseInt(req.params.id) },
            data: {
                titulo: titulo || undefined,
                descricao: descricao || undefined,
                nivel: nivel || undefined,
                categoria_ID: categoria_ID ? parseInt(categoria_ID) : undefined,
                pessoa_ID: pessoa_ID ? parseInt(pessoa_ID) : undefined
            }
        });
        res.json(ofertaAtualizada);
    } catch (e) { res.status(500).json({ error: "Erro ao atualizar" }); 
}
});

app.listen(8080, () => console.log("🚀 Backend 100% Completo em http://localhost:8080"));