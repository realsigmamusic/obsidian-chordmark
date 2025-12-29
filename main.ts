import { Plugin } from 'obsidian';
import { parseSong, renderSong } from 'chord-mark';

export default class ChordMarkPlugin extends Plugin {
    async onload() {
        // Registra o processador de bloco de código
        this.registerMarkdownCodeBlockProcessor("chordmark", (source, el, ctx) => {
            try {
                // Container principal
                const mainContainer = el.createDiv({ cls: 'chord-mark-wrapper' });

                // Barra de controles
                const controlBar = mainContainer.createDiv({ cls: 'chord-mark-controls' });

                // Botão de diminuir tom
                const btnDown = controlBar.createEl('button', {
                    text: '-',
                    cls: 'chord-mark-btn',
                    title: 'Diminuir tom'
                });

                // Display do tom atual
                const transposeDisplay = controlBar.createEl('span', {
                    text: 'Tom: Original',
                    cls: 'chord-mark-transpose-display'
                });

                // Botão de aumentar tom
                const btnUp = controlBar.createEl('button', {
                    text: '+',
                    cls: 'chord-mark-btn',
                    title: 'Aumentar tom'
                });

                // Botão de reset
                const btnReset = controlBar.createEl('button', {
                    text: 'Reset',
                    cls: 'chord-mark-btn chord-mark-btn-reset',
                    title: 'Restaurar tom'
                });

                // Botão de edição
                const btnEdit = controlBar.createEl('button', {
                    text: 'Edit',
                    cls: 'chord-mark-btn chord-mark-btn-edit',
                    title: 'Editar cifra'
                });

                // Container para a cifra
                const songContainer = mainContainer.createDiv({ cls: 'chord-mark-container' });

                // Estado da transposição
                let currentTranspose = 0;

                // Mapa de notas com sustenidos
                const notesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

                // Mapa de notas com bemóis
                const notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

                // Mapeamento de equivalências
                const noteMap: { [key: string]: number } = {
                    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
                    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
                    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
                };

                // Função para transpor um acorde individual
                const transposeChord = (chord: string, semitones: number): string => {
                    // Regex para capturar a nota raiz (incluindo # ou b)
                    const match = chord.match(/^([A-G][#b]?)(.*)/);
                    if (!match) return chord;

                    const rootNote = match[1];
                    const suffix = match[2];

                    // Encontrar o índice da nota
                    const noteIndex = noteMap[rootNote];
                    if (noteIndex === undefined) return chord;

                    // Calcular o novo índice
                    let newIndex = (noteIndex + semitones) % 12;
                    if (newIndex < 0) newIndex += 12;

                    // Escolher entre sustenido ou bemol baseado no acorde original
                    const useFlat = rootNote.includes('b');
                    const newNote = useFlat ? notesFlat[newIndex] : notesSharp[newIndex];

                    return newNote + suffix;
                };

                // Função para transpor todo o texto
                const transposeText = (text: string, semitones: number): string => {
                    if (semitones === 0) return text;

                    // Padrão para acordes: letra maiúscula seguida por # ou b opcional, 
                    // seguida por qualquer combinação de caracteres de acorde
                    const chordPattern = /\b([A-G][#b]?)([m|M]?(?:aj|in)?[0-9]?[0-9]?(?:sus|add|dim|aug)?[0-9]?(?:\/[A-G][#b]?)?)\b/g;

                    return text.replace(chordPattern, (match, root, suffix) => {
                        return transposeChord(root + suffix, semitones);
                    });
                };

                // Função para renderizar a música
                const renderMusic = (transposeValue: number) => {
                    songContainer.empty();

                    try {
                        // Transpor o texto original
                        const transposedSource = transposeText(source, transposeValue);

                        // Parse da música (já transposta)
                        const parsed = parseSong(transposedSource);

                        // Renderizar para HTML
                        const rendered = renderSong(parsed, {
                            alignBars: true,
                            alignChordsWithLyrics: true,
                            printChordsDuration: 'auto',
                            chartType: 'complete' // 'complete': Letra e Cifra. 'lyrics': Só letra. 'chords': Só acordes (Lead Sheet).
                        });

                        songContainer.innerHTML = rendered;

                        // Atualizar display
                        if (transposeValue === 0) {
                            transposeDisplay.setText('Tom: Original');
                        } else if (transposeValue > 0) {
                            transposeDisplay.setText(`Tom: +${transposeValue}`);
                        } else {
                            transposeDisplay.setText(`Tom: ${transposeValue}`);
                        }

                    } catch (error) {
                        songContainer.createEl("div", {
                            text: "Erro ao renderizar: " + error.message,
                            cls: 'chord-mark-error'
                        });
                    }
                };

                // Event listener do botão de edição
                btnEdit.addEventListener('click', () => {
                    // Pega a seção do documento onde este bloco está
                    const sectionInfo = ctx.getSectionInfo(el);
                    if (sectionInfo) {
                        // @ts-ignore - Acessa a view atual do Obsidian
                        const view = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
                        if (view) {
                            // Muda para o modo de edição se estiver em leitura
                            view.setState({ mode: "source" }, { history: true });

                            // Coloca o cursor na linha inicial do bloco de código
                            view.editor.setCursor({ line: sectionInfo.lineStart, ch: 0 });
                            view.editor.focus();
                        }
                    }
                });

                // Event listeners dos botões
                btnUp.addEventListener('click', () => {
                    currentTranspose++;
                    renderMusic(currentTranspose);
                });

                btnDown.addEventListener('click', () => {
                    currentTranspose--;
                    renderMusic(currentTranspose);
                });

                btnReset.addEventListener('click', () => {
                    currentTranspose = 0;
                    renderMusic(currentTranspose);
                });

                // Renderização inicial
                renderMusic(0);

            } catch (error) {
                el.createEl("h3", { text: "Erro no ChordMark: " + error.message });
            }
        });
    }
}