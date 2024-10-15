import React, {useState} from 'react';
import {useApp, useInput, Box, Newline, Text} from 'ink';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';

const nonZeroNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(String);

const DEFAULT_DUPES_FILE = 'remove-dupes.sh';

const getColor = bool => (bool ? 'green' : 'yellow');

export default function App({dupes, removeDupesFile = DEFAULT_DUPES_FILE}) {
	const {exit} = useApp();
	const [dupeIndex, setDupeIndex] = useState(0);
	const dupe = dupes[dupeIndex];
	const [toSave, setToSave] = useState([]);

	const canMoveBack = dupeIndex > 0;
	const canMoveForward = dupeIndex < dupes.length - 1;

	useInput((input, key) => {
		if (input === 'q') exit(0);
		if (input === 's') {
			let commandString = '#!/bin/sh\n\n';
			for (let d of dupes) {
				for (let filePath of d.filePaths) {
					commandString += `${
						toSave.includes(filePath) ? '# ' : ''
					}rm -v '${filePath.replace(/\'/g, `\\'`)}';\n`;
				}
				commandString += '\n';
			}
			writeFileSync(join(process.cwd(), removeDupesFile), commandString, {
				encoding: 'utf8',
				mode: 0o700,
			});

			exit(0);
		}
		if ((input === 'b' || key.leftArrow) && canMoveBack)
			setDupeIndex(prev => prev - 1);
		else if ((input === 'n' || key.rightArrow) && canMoveForward)
			setDupeIndex(prev => prev + 1);
		else if (nonZeroNumbers.includes(input)) {
			const filePath = dupe.filePaths[parseInt(input, 10) - 1];
			if (!filePath) return;
			if (toSave.includes(filePath))
				setToSave(prev => prev.filter(p => p !== filePath));
			else setToSave(prev => [...prev, filePath]);
		}
	});

	return (
		<Box flexDirection="column">
			<Box borderStyle="round" width={78} paddingLeft={1} paddingRight={1}>
				<Box justifyContent="center" alignItems="center">
					<Text>
						({dupeIndex + 1} / {dupes.length}){'    '}
						<Text bold dimColor={!canMoveBack} color="green">
							← b
						</Text>
						ack{'    '}
						<Text bold dimColor={!canMoveForward} color="green">
							n
						</Text>
						ext{' '}
						<Text bold dimColor={!canMoveForward} color="green">
							→
						</Text>
						{'    '}
						<Text bold color="green">
							s
						</Text>
						ave and quit{'    '}
						<Text bold color="green">
							q
						</Text>
						uit
					</Text>
				</Box>
			</Box>
			<Text>
				{dupe.filePaths.map((p, idx) => (
					<Text color={toSave.includes(p) ? 'green' : 'red'} key={p}>
						<Text bold>{idx + 1}</Text>. {p}
						<Newline />
					</Text>
				))}
			</Text>
		</Box>
	);
}
