import _ from 'lodash';
import {isAbsolute, join} from 'node:path';

const mapDupeEntry = e => _.mapKeys(e, (_v, k) => _.camelCase(k));
const filterDupeEntry = e => e.filePaths.length > 1;

export const loadDupeFile = async path => {
	const filePath = isAbsolute(path)
		? path
		: join(process.cwd(), process.argv[2]);
	const {default: rawEntries} = await import(filePath, {
		assert: {type: 'json'},
	});
	return rawEntries.map(mapDupeEntry).filter(filterDupeEntry);
};

export default loadDupeFile;
