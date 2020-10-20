#!/bin/bash

shp2geojson() #filename
{
	filename=$1
	echo "start processing file: $filename";
	ogr2ogr -f GeoJSON --config SHAPE_ENCODING Big5 -lco ENCODING=UTF-8 "$filename.geojson" "$filename"
	echo "fininsh Processing file: $filename";
}

conv_file() #filename
{
	filename=$1
	if [ -e "$filename" ];then
		shp2geojson $filename
	else
		echo "file not exists"
	fi
	exit 0    
}

conv_dir() #dir
{
	dir=$1
	if [ -d "$dir" ];then
		find $dir -iname "*.shp" | while read line; do
			shp2geojson $line
		done
	else
		echo "directory not exists"
	fi
	exit 0    
}


print_usage ()
{
	echo "Usage: shp2geojson -h | -f <filename> | -d <directory>"
	echo "-f, --file                convert shp file to geojson format"
	echo "-d, --directory           convert all shp file under this directory to geojson format recursively"
	echo "-h, --help                Print this usage message."
}

# main ()
# {
opts=$(getopt \
	--longoptions=help,directory:,file: \
	--options=hd:f: \
	-- "$@" || exit 101
)


if [ "$#" -eq 0 ];then
	eval set -- "$opts"
fi

while [ "$#" -gt '0' ]
do
	case "$1" in
		(-d|--directory)
			conv_dir $2
			shift 2
			break
			;;
		(-f|--file)
			conv_file $2
			shift 2
			break
			;;        
		(-h|--help)
			print_usage
			shift 1
			break
			;;
		(--|*)
			print_usage
			shift 1
			break
			;;
	esac
done

exit 0
# }
