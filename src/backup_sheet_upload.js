(function() {
    'use strict';

    /**
     * @ngdoc function
     * @name app.controller:sheetUploadCtrl
     * @description
     * # sheetUploadCtrl
     * Controller of the app
     */

    angular
        .module('sheetUpload')
        .controller('sheetUploadCtrl', sheetUpload);

    sheetUpload.$inject = ['sheetUploadService', '$mdDialog', 'gridConfigService', 'CustomToastService',
        'agGridFilterConverterService', '$filter', 'agGridCustomFilters', '$mdMedia', 'ConstantsUtil',
        'CustomToastService', 'agGridFormatter', 'LoadingDialogService'];


    function sheetUpload(sheetUploadService, $mdDialog, gridConfigService, agGridCustomFilters,
                         agGridFilterConverterService, $filter, CustomFilters, $mdMedia, ConstantsUtil, CustomToastService,
                         agGridFormatter, LoadingDialogService) {
        var vm = this;

        vm.openUploadDialog = openUploadDialog;
        vm.confirmUpload = confirmUpload;
        vm.upload = upload;
        vm.importFromSap = _importFromSap;


        /**
         * This function its needed so the upload dialog can be shown
         * @param ev
         */
        function openUploadDialog(ev) {
            var uploadSheetInfo = {
                sheetType: vm.selectedSheet.label,
                dataPaging: vm.dataPaging
            };
            $mdDialog.show({
                controller: 'uploadDialogCtrl',
                templateUrl: 'app/modules/sheet-upload/tmpl/upload-dialog.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose:true,
                locals: { uploadSheetInfo: uploadSheetInfo }
            }).then(function() {
                //Carregando combos dos filtros de ano e semana, de acordo com o novo upload
                loadYearsFromDB(function(response){
                    vm.yearsList = [];
                    // We need to get just the year property of the entity
                    if(response.result.length > 0){
                        vm.yearsList = response.result.map(function(item){
                            return item.year;
                        });
                    } else {
                        // If there is no register of the selected sheet we return the current year
                        vm.yearsList = [new Date().getFullYear()];
                    }

                    vm.selectedYear = vm.yearsList[FIRST_POSITION];

                    loadWeeksFromDB(function(response){
                        vm.weekList = [];
                        if(response.result.length > 0){
                            vm.weekList = response.result.map(function(item){
                                return item.week;
                            });
                        } else {
                            vm.weekList.push(getCurrentWeek());
                        }
                        vm.selectedWeek = vm.weekList[FIRST_POSITION];

                        //Reload do grid, de acordo com os novos filtros selecionados automaticamente após o upload
                        // pegando sempre o último item do array, tanto de anos quanto de semanas (o upload mais recente)
                        vm.gridOptions.api.setDatasource(vm.dataSource);
                    });
                }, true);
            });
        };

        /**
         * This function its needed so the user can confirm if he wants to override the current sheet information
         * @param ev
         */
        function confirmUpload(ev) {
            var confirm = $mdDialog.confirm()
                .title('Confirmar Upload')
                .textContent('Upload irá sobrescrever dados já existentes referentes ao Ano e Semana correntes.'+
                    ' Deseja continuar?')
                .ariaLabel('Confirmar Upload')
                .targetEvent(ev)
                .ok('Continuar')
                .cancel('Cancelar');
            $mdDialog.show(confirm).then(function() {
                openUploadDialog(ev);
            });
        };



        /**
         *
         * @param ev
         */
        function upload(ev){
            //if the grid is populated, it means we have to ask if the user wants to overwrite the data
            if(vm.gridOptions.api.getRenderedNodes().length !== 0){
                confirmUpload(ev);
            } else {
                //if the grid isn't populated we still need to check in the database if the selected sheet
                // has items from the selected year and week.
                var searchData = {year: vm.selectedYear, week: vm.selectedWeek, sheet: vm.selectedSheet.label};
                //calling service to check if the selected sheet has items in database
                sheetUploadService.checkIfHasSheet(searchData)
                    .then(function(response){
                        if(response.result){
                            confirmUpload(ev);
                        } else {
                            openUploadDialog(ev);
                        }
                    })
                    .catch(function(response){
                        CustomToastService.show("Sistema indisponível", "top right", 5000);
                    });
            }
        }



        function _importFromSap(){
            LoadingDialogService.show();
            sheetUploadService.importFromSAP(vm.selectedSheet.label)
                .then(function () {
                    CustomToastService.show("Informações importadas com sucesso", "top right", 5000);
                    onGridReady();
                })
                .catch(function (error) {
                    var message = error.status === -1 ? "Sistema Indiponível" : error.err.message;
                    CustomToastService.show(message, "top right", 5000);
                }).finally(function () {
                LoadingDialogService.hide();
            });
        }

    }
})();
