#!/bin/bash
render_prompt(){
    local cols p_len p_offset lp_space rp_space
    cols=$(tput cols)
    p_len="${#1}"
    lp_space="$(( (cols - p_len) / 2 - 2 ))"
    rp_space="$(( (cols - p_len) / 2 - 2 ))"
    p_offset=$(( cols - p_len - lp_space - rp_space - 4))
    printf '||%*s%s%*s||' "${lp_space}" "" "${1}" "$(( rp_space + p_offset ))" ""
}

draw_prompt(){
    green=$(tput setaf 2)
    reset=$(tput sgr0)
    local padded_line line spacer cols p_len
    cols=$(tput cols)
    p_len="${#1}"
    local i=1
    local inc="${p_len}"
    if (( cols < p_len ))
    then
        inc=$(printf '%.0f\n' "$(bc <<<"${cols}*.8" || true)")
    fi
    padded_line="$(printf '%*s' "${cols}" '')"
    line=$(tr ' ' = <<< "${padded_line}")
    spacer=$(printf '||%*s||' "$(( cols - 4 ))" "")
    printf "${green}\n\n%s\n%s\n" "${line}" "${spacer}"
    while (( i < p_len ))
    do
        local sub_prompt temp_inc offset
        temp_inc=0
        offset=0
        if (( (i+inc)<=p_len ))
        then
            sub_prompt="$(cut -c  "${i}-$(( i+inc ))" <<<"${1}" | rev || true)"
            temp_inc=${sub_prompt%%" "*}
            temp_inc=${#temp_inc}
            offset=1
        fi
        render_prompt "$(cut -c  "${i}-$(( i+inc-temp_inc-offset ))" <<<"${1}" || true)"
        i=$(( i+inc-temp_inc+offset ))
    done
    printf "\n%s\n%s\n\n${reset}" "${spacer}" "${line}"
}

run_terraform_test(){
    cd "$(dirname "${0}")/test/terraform" || exit
    # terraform init
    terraform apply -auto-approve
    draw_prompt "OUTPUT"
    terraform output -json | jq -r '.json_string.value' | jq -r || true
}
test=""
while getopts t: flag
do
    case "${flag}" in
        t) test=${OPTARG};;
        *) echo "invalid flag"
    esac
done

if [[ " ${test} " =~ " terraform " ]]; then
    run_terraform_test
fi