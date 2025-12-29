all: run install

run:
	node esbuild.config.mjs

install:
	cp main.js /home/samuel/Obsidian/.obsidian/plugins/chordmark/
	cp manifest.json /home/samuel/Obsidian/.obsidian/plugins/chordmark/
	cp styles.css /home/samuel/Obsidian/.obsidian/plugins/chordmark/