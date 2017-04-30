import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Recent } from '../../providers/recent';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  items: any; //Array<{ podcast_title: string, title: string }>;
  selectedItem: any;
  errorMessage;

  constructor(public navCtrl: NavController, private recent: Recent) {
    recent.getItems().subscribe(
      items => this.items = items,
      error => this.errorMessage = <any>error)
  }

  isSelected(item): boolean {
    return this.selectedItem === item

  }
  itemTapped(event, item) {
    console.log('click')
    this.selectedItem = (this.isSelected(item)) ? null : item
  }

}
